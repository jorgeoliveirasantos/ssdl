// ================================
// Simple SQLite Database Layer
// v0.0 (2024) — Rascunho inicial
// v0.1 (2025) — Correções estruturais e melhorias no sistem de logging (sempre manter a simplicidade)
// Consulte o arquivo README.md para instruções de uso.
// ================================
// Copyright © 2024 Jorge Souza Oliveira dos Santos. Todos os direitos reservados.
// ================================

//#region CONFIG
const SQLITE = require("sqlite3").verbose();

/**
 * @typedef {Object} ConfigType
 * @property {string} database_folder Root folder where databases are stored
 * @property {string} database_version Active database version
 */

/**
 * Global configuration object.
 * Defines base storage paths and active database version.
 * @type {ConfigType}
 */

const Config = {
    database_folder: "K:/Data",
    database_version: "0.0", // Test database
    // database_version: "0.1", // Production database v0.1
};
//#endregion

//#region PATH RESOLUTION
/**
 * Base utilities related to filesystem paths.
 */
const BaseState = {
    Path: (base = []) => {
        return require("path").join(
            Config.database_folder,
            Config.database_version,
            ...base
        );
    },
};
//#endregion

//#region DATA LAYER
/**
 * Low-level data access layer.
 * Handles SQLite connection lifecycle and filesystem preparation.
 */
const Data = {
    /**
     * Executes a query expecting a single row.
     *
     * @param {string} arq Database file name
     * @param {string} sql SQL query
     * @param {any[]} values Bound query parameters
     * @returns {Promise<Object|undefined>}
     */
    Check: async (arq, sql, values) => {
        return Data.Execute(arq, sql, values, "get");
    },
    /**
     * Executes a query expecting multiple rows.
     *
     * @param {string} arq Database file name
     * @param {string} sql SQL query
     * @param {any[]} values Bound query parameters
     * @returns {Promise<Object[]>}
     */
    Read: async (arq, sql, values) => {
        return Data.Execute(arq, sql, values, "all");
    },
    /**
     * Executes a write operation (INSERT, UPDATE, DELETE).
     *
     * @param {string} arq Database file name
     * @param {string} sql SQL query
     * @param {any[]} values Bound query parameters
     * @returns {Promise<number>} Number of affected rows
     */
    Write: async (arq, sql, values) => {
        return Data.Execute(arq, sql, values, "run");
    },
    /**
     * Core execution method.
     * Automatically creates directories and manages SQLite connection lifecycle.
     *
     * @param {string} arq Database file name
     * @param {string} sql SQL query
     * @param {any[]} values Bound query parameters
     * @param {"get"|"all"|"run"} method Execution mode
     * @returns {Promise<any>}
     */
    Execute: async (arq, sql, values, method) => {
        const dir = require("path").dirname(BaseState.Path([arq]));
        if (!require("fs").existsSync(dir)) require("fs").mkdirSync(dir, { recursive: true });
        //
        const db = new SQLITE.Database(BaseState.Path([arq]));
        //
        try {
            return await new Promise((resolve, reject) => {
                const callback = (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                };

                if (method == "get") {
                    db.get(sql, values, callback);
                } else if (method == "all") {
                    db.all(sql, values, callback);
                } else if (method == "run") {
                    db.run(sql, values, function (err) {
                        callback(err, this.changes);
                    });
                }
            });
        } finally {
            db.close();
        }
    },
    /****
    Execute: async (arq, sql, values, method) => {
        return new Promise((resolve, reject) => {
            const db = new SQLITE.Database(BaseState.Path([arq]));
            const callback = (err, result) => {
                db.close();
                if (err) reject(err);
                else resolve(result);
            };

            if (method == "get") {
                db.get(sql, values, callback);
            } else if (method == "all") {
                db.all(sql, values, callback);
            } else if (method == "run") {
                db.run(sql, values, function (err) {
                    callback(err, this.changes);
                });
            }
        });
    }
    ****/
};
//#endregion

//#region QUERY LAYER
/**
 * High-level query abstraction layer.
 * Responsible for schema management and CRUD operations.
 */
const Query = {
    /**
     * Creates a table if it does not exist.
     * Object keys define column names.
     * The `Id` field is enforced as PRIMARY KEY.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {Object} obj Schema definition object
     * @returns {Promise<number|null>}
     */
    CheckTable: async (db, table, obj) => {
        let keys = Object.keys(obj).join(' TEXT, ');
        let query = `CREATE TABLE IF NOT EXISTS "${table}" (${keys});`;
        query = query.replace("Id TEXT,", "Id TEXT NOT NULL PRIMARY KEY,");
        query = query.replace(");", " TEXT);");
        try {
            return await Data.Write(db, query, []);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * Checks if a record exists by Id.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} id Record identifier
     * @returns {Promise<boolean>}
     */
    Check: async (db, table, id) => {
        try {
            const res = await Data.Check(db, `SELECT * FROM '${table}' WHERE Id = ?`, [id]);
            return res != undefined;
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return false;
        }
    },
    /**
     * Inserts a new record.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {Object} obj Data object
     * @returns {Promise<number|null>}
     */
    Create: async (db, table, obj) => {
        let keys = Object.keys(obj).join(', ');
        let values = Object.values(obj);
        let placeholders = values.map(() => '?').join(', ');

        let query = `INSERT INTO "${table}" (${keys}) VALUES (${placeholders});`;

        try {
            return await Data.Write(db, query, values);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * Retrieves a single record by Id.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} id Record identifier
     * @param {Object} obj Projection object (keys define selected columns)
     * @returns {Promise<Object|null>}
     */
    Get: async (db, table, id, obj) => {
        let keys = Object.keys(obj).join(', ');
        let query = `SELECT ${keys} FROM "${table}" WHERE Id = ?;`;
        try {
            const res = await Data.Read(db, query, [id]);
            return res[0];
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * Retrieves multiple records filtered by a specific column.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} property Column name used as filter
     * @param {any} value Value to match
     * @param {Object} obj Projection object (keys define selected columns)
     * @returns {Promise<Object[]>}
     */
    GetManyByProperty: async (db, table, property, value, obj) => {
        const keys = Object.keys(obj).join(", ");
        const query = `SELECT ${keys} FROM "${table}" WHERE ${property} = ?;`;

        try {
            return await Data.Read(db, query, [value]);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return [];
        }
    },
    /**
     * Retrieves all records from a table.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @returns {Promise<Object[]>}
     */
    GetAll: async (db, table) => {
        const query = `SELECT * FROM "${table}";`;

        try {
            return await Data.Read(db, query, []);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return [];
        }
    },

    /**
     * Retrieves all record Ids from a table.
     * 
     * @param {string} db Database file name
     * @param {string} table Table name
     * @returns {Promise<Object[]>}
     */

    GetAllIds: async (db, table) => {
        const query = `SELECT Id FROM "${table}";`;

        try {
            return await Data.Read(db, query, []);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return [];
        }
    },
    /** 
     * @description This is used to get an User Id by the user himself
     * 
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} username Username
     * @returns {Promise<string|null>}
     */
    GetIdByUsername: async (db, table, username) => {
        const query = `SELECT Id FROM "${table}" WHERE Username = ?;`;

        try {
            const res = await Data.Read(db, query, [username]);
            if (!res[0] || !res[0]["Id"]) return null;
            return res[0]["Id"];
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * @description This is used to get an User Id by the user email
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} mail User email
     * @returns {Promise<string|null>}
     */
    GetIdByEmail: async (db, table, mail) => {
        const query = `SELECT Id FROM "${table}" WHERE Email = ?;`;
        try {
            const res = await Data.Read(db, query, [mail]);
            if (!res[0] || !res[0]["Id"]) return null;
            return res[0]["Id"];
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * @description Gets a specific property of a record
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} property Property name
     * @param {string} id Record identifier
     * @returns {Promise<any|null>}
     */
    GetProperty: async (db, table, property, id) => {
        const query = `SELECT ${property} FROM "${table}" WHERE Id = ?;`;

        try {
            const res = await Data.Read(db, query, [id]);
            return res[0][property];
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * Updates an existing record.
     * The Id field is mandatory.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {Object} obj Updated data (must include Id)
     * @returns {Promise<number|null>}
     */
    Modify: async (db, table, obj) => {
        let keys = Object.keys(obj).filter(key => key.toLowerCase() !== 'id');
        let values = keys.map(key => obj[key]);
        let placeholders = keys.map(key => `${key} = ?`).join(', ');

        let id = obj['Id'] || obj['ID'] || obj['id'];
        values.push(id);

        let query = `UPDATE "${table}" SET ${placeholders} WHERE Id = ?;`;

        try {
            return await Data.Write(db, query, values);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    },
    /**
     * Deletes a record by Id.
     *
     * @param {string} db Database file name
     * @param {string} table Table name
     * @param {string} id Record identifier
     * @returns {Promise<number|null>}
     */
    Remove: async (db, table, id) => {
        const query = `DELETE FROM "${table}" WHERE Id = ?;`;
        try {
            return await Data.Write(db, query, [id]);
        } catch (err) {
            Logger.Log("Database query failed", "error", err);
            return null;
        }
    }
};
//#endregion

//#region LOGGER
/**
 * @description File-based logging system.
 * Designed for post-mortem analysis and debugging.
 */
const Logger = {
    State: {
        Type: "info",
        DateTime: null,
        UserID: null,
        MemoryUsage: null,
        Message: "",
        Error: "",
        Trace: ""
    },
    /**
     * Writes a structured log file to disk.
     *
     * @param {string} msg Log message
     * @param {"info"|"error"} type Log severity
     * @param {Error|null} error Error object
     * @returns {Promise<void>}
     */
    Log: async (msg = "empty message", type = "info", error = new Error()) => {
        Logger.State.DateTime = new Date().toLocaleString().replaceAll("/", "").replaceAll(":", "").replaceAll(", ", "-");
        Logger.State.MemoryUsage = (require("os").freemem() / 1000000000).toFixed(2);
        if (error != null) Logger.State.Error += error.message;
        Logger.State.Trace += error.stack.split("\n")[1];
        Logger.State.Message = msg;
        Logger.State.Type = type == null ? "info" : type;
        let logFileName = `${Config.database_folder}/log/${Logger.State.DateTime}`;
        if (Logger.State.Type == "error") logFileName += "!";
        logFileName += ".log";
        console.log("\n\n-=-=-=-=-=-=-=-=- " + type + ": -=-=-=-=-=-=-=-");
        console.log(Logger.State.Message);
        console.log(Logger.State.Trace);
        console.log(logFileName);
        console.log("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-\n\n");
        require("fs").writeFileSync(logFileName, JSON.stringify(Logger.State, false, 3), "utf-8");
        Logger.State.Type = "info";
        Logger.State.DateTime = null;
        Logger.State.UserID = null;
        Logger.State.MemoryUsage = null;
        Logger.State.Message = "";
        Logger.State.Error = "";
        Logger.State.Trace = "";
    }
};
//#endregion

module.exports = { Query, Config, Logger };
