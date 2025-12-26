# Documentação **Simple SQLite Database Layer**

## Visão Geral
Biblioteca Node.js para operações SQLite com logging integrado, fornecendo abstração simples para operações CRUD e gerenciamento de banco de dados.

## Instalação e Configuração

### Pré-requisitos
```bash
npm install sqlite3
```

### Configuração Inicial
```javascript
// No arquivo data.js, ajuste as configurações:
const Config = {
    database_folder: "./data",      // Caminho para os arquivos do banco
    database_version: "0.0",        // "0.0" para teste, "0.1" para produção
};
```

## Estrutura de Diretórios
```
K:/Data/ (ou caminho configurado)
├── 0.0/           # Banco de dados de teste
├── 0.1/           # Banco de dados de produção
└── log/           # Arquivos de log
```

## Módulos Exportados

### `Query` - Operações de Banco de Dados
### `Config` - Configurações
### `Logger` - Sistema de Logging

---

## API Query - Operações CRUD

### 1. **Gerenciamento de Tabelas**

#### `CheckTable(db, table, schemaObject)`
Cria uma tabela se não existir.

**Parâmetros:**
- `db` (string): Nome do arquivo do banco (ex: `"users.db"`)
- `table` (string): Nome da tabela
- `schemaObject` (object): Objeto com estrutura da tabela

**Exemplo:**
```javascript
const userSchema = {
    Id: "",
    Username: "",
    Email: "",
    Password: "",
    CreatedAt: ""
};

await Query.CheckTable("users.db", "Users", userSchema);
// Cria tabela com colunas TEXT, Id como PRIMARY KEY
```

### 2. **Operações Básicas CRUD**

#### `Create(db, table, dataObject)`
Insere um novo registro.

```javascript
const newUser = {
    Id: "user_001",
    Username: "joao",
    Email: "joao@email.com",
    Password: "hash123",
    CreatedAt: "2024-01-15"
};

const result = await Query.Create("users.db", "Users", newUser);
// result = número de linhas afetadas
```

#### `Get(db, table, id, schemaObject)`
Recupera um registro por ID.

```javascript
const userSchema = { Id: "", Username: "", Email: "" };
const user = await Query.Get("users.db", "Users", "user_001", userSchema);
// Retorna: { Id: "user_001", Username: "joao", Email: "joao@email.com" }
```

#### `Modify(db, table, dataObject)`
Atualiza um registro existente.

```javascript
const updatedUser = {
    Id: "user_001",  // Identificador obrigatório
    Username: "joao_silva",
    Email: "joao.novo@email.com"
};

const result = await Query.Modify("users.db", "Users", updatedUser);
// result = número de linhas afetadas
```

#### `Remove(db, table, id)`
Remove um registro.

```javascript
const result = await Query.Remove("users.db", "Users", "user_001");
// result = número de linhas afetadas
```

#### `Check(db, table, id)`
Verifica se um registro existe.

```javascript
const exists = await Query.Check("users.db", "Users", "user_001");
// Retorna: true ou false
```

### 3. **Operações de Consulta**

#### `GetAll(db, table)`
Retorna todos os registros da tabela.

```javascript
const allUsers = await Query.GetAll("users.db", "Users");
// Retorna array de objetos
```

#### `GetAllIds(db, table)`
Retorna apenas os IDs da tabela.

```javascript
const userIds = await Query.GetAllIds("users.db", "Users");
// Retorna: [{Id: "user_001"}, {Id: "user_002"}, ...]
```

#### `GetIdByUsername(db, table, username)`
Busca ID pelo nome de usuário.

```javascript
const userId = await Query.GetIdByUsername("users.db", "Users", "joao");
// Retorna: "user_001" ou null
```

#### `GetIdByEmail(db, table, email)`
Busca ID pelo email.

```javascript
const userId = await Query.GetIdByEmail("users.db", "Users", "joao@email.com");
// Retorna: "user_001" ou null
```

#### `GetProperty(db, table, property, id)`
Recupera valor específico de uma coluna.

```javascript
const username = await Query.GetProperty("users.db", "Users", "Username", "user_001");
// Retorna: "joao"
```

#### `GetMany(db, table, id, schemaObject)`
*Nota: Funcionalmente igual a `Get`, mas retorna array.*

---

## Módulo Logger

### `Log(message, type, error)`
Registra eventos no sistema de log.

**Parâmetros:**
- `message` (string): Mensagem descritiva
- `type` (string): Tipo do log ("info", "error", "warning")
- `error` (Error): Objeto de erro opcional

**Exemplos:**
```javascript
// Log informativo
await Logger.Log("Usuário autenticado com sucesso", "info");

// Log de erro
try {
    await Query.Create("users.db", "Users", invalidData);
} catch (error) {
    await Logger.Log("Falha ao criar usuário", "error", error);
}
```

**Arquivos de Log:**
```
log/
├── 01152024-143045.log        # Log normal
├── 01152024-143102!.log       # Log de erro (com !)
└── 01152024-143115.log
```

**Formato do Log:**
```json
{
    "Type": "error",
    "DateTime": "01152024-143102",
    "UserID": null,
    "MemoryUsage": "3.45",
    "Message": "Falha ao criar usuário",
    "Error": "SQLITE_ERROR: table Users has no column named Phone",
    "Trace": "    at Query.Create (data.js:45:35)"
}
```

---

## Data - Interface de Baixo Nível

### Métodos Disponíveis:

```javascript
// Verifica existência (retorna um registro)
const exists = await Data.Check("users.db", "SELECT * FROM Users WHERE Id = ?", ["user_001"]);

// Leitura múltipla (retorna array)
const users = await Data.Read("users.db", "SELECT * FROM Users WHERE Active = ?", [1]);

// Execução (INSERT, UPDATE, DELETE)
const changes = await Data.Write("users.db", "DELETE FROM Users WHERE Id = ?", ["user_001"]);
// changes = número de linhas afetadas
```

---

# Exemplos Completos

### Exemplo 1: Sistema de Usuários
```javascript
const { Query, Logger } = require('./data.js');

class UserManager {
    constructor() {
        this.dbFile = "users.db";
        this.table = "Users";
        this.schema = {
            Id: "",
            Username: "",
            Email: "",
            Password: "",
            CreatedAt: "",
            LastLogin: ""
        };
    }

    async initialize() {
        await Query.CheckTable(this.dbFile, this.table, this.schema);
        Logger.Log("Tabela de usuários inicializada", "info");
    }

    async registerUser(userData) {
        try {
            // Verifica se usuário já existe
            const exists = await Query.Check(this.dbFile, this.table, userData.Id);
            if (exists) {
                throw new Error("Usuário já existe");
            }

            // Adiciona timestamp
            userData.CreatedAt = new Date().toISOString();
            
            // Cria usuário
            const result = await Query.Create(this.dbFile, this.table, userData);
            
            Logger.Log(`Usuário ${userData.Username} criado`, "info");
            return result;
        } catch (error) {
            await Logger.Log("Erro no registro", "error", error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        const userId = await Query.GetIdByEmail(this.dbFile, this.table, email);
        if (!userId) return null;
        
        return await Query.Get(this.dbFile, this.table, userId, this.schema);
    }
}

// Uso
const manager = new UserManager();
await manager.initialize();
```

### Exemplo 2: Sistema de Tarefas (Todo List)
```javascript
const taskSchema = {
    Id: "",
    Title: "",
    Description: "",
    Status: "",  // "pending", "in-progress", "completed"
    Priority: "", // "low", "medium", "high"
    DueDate: "",
    CreatedBy: ""
};

await Query.CheckTable("tasks.db", "Tasks", taskSchema);

// Criar tarefa
await Query.Create("tasks.db", "Tasks", {
    Id: "task_" + Date.now(),
    Title: "Implementar API",
    Description: "Criar endpoints REST",
    Status: "pending",
    Priority: "high",
    DueDate: "2024-01-30",
    CreatedBy: "user_001"
});

// Buscar tarefas pendentes de alta prioridade
const allTasks = await Query.GetAll("tasks.db", "Tasks");
const urgentTasks = allTasks.filter(task => 
    task.Status === "pending" && task.Priority === "high"
);
```

---

## Considerações de Segurança

### 1. **Validação de Entrada**
```javascript
// SEMPRE valide dados antes de usar
function sanitizeTableName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, '');
}

const safeTable = sanitizeTableName(userInputTable);
```

### 2. **Tratamento de Erros**
```javascript
try {
    await Query.Modify("db.db", "Table", data);
} catch (error) {
    // Registre o erro
    await Logger.Log("Operação falhou", "error", error);
    
    // Retorne resposta segura
    return {
        success: false,
        error: "Operação não pode ser completada"
    };
}
```

### 3. **Gerenciamento de Conexões**
- A biblioteca gerencia automaticamente abertura/fechamento
- Não use em loops muito apertados (cria nova conexão a cada chamada)

---

## Migração entre Versões

### Teste → Produção
1. Altere `database_version` no Config
2. Crie backup dos dados
3. Execute scripts de migração se necessário

```javascript
// Configuração para produção
const Config = {
    database_folder: "/var/data/app",
    database_version: "0.1",  // Produção
};
```

---

## Boas Práticas

### 1. **Padronização de IDs**
```javascript
// Use formatos consistentes
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### 2. **Logging Consistente**
```javascript
// Categorize logs por módulo
await Logger.Log("[AUTH] Login bem-sucedido", "info");
await Logger.Log("[DB] Tabela criada", "info");
```

### 3. **Monitoramento de Performance**
```javascript
// Verifique logs periodicamente
// Monitore uso de memória nos logs
// Revise arquivos de log grandes (>10MB)
```

---

## Troubleshooting

### Problema Comum 1: "Database is locked"
**Solução:** 
- Verifique se há múltiplas instâncias acessando o banco
- Implemente fila de operações se necessário

### Problema Comum 2: "No such table"
**Solução:**
```javascript
// Sempre inicialize tabelas no startup
async function initializeDatabase() {
    await Query.CheckTable("app.db", "Users", userSchema);
    await Query.CheckTable("app.db", "Settings", settingsSchema);
    // ...
}
```

### Problema Comum 3: Logs não sendo criados
**Solução:**
- Verifique permissões de escrita no diretório `Config.database_folder + "/log/"`
- Confira se o diretório existe

---

## Licença e Considerações

### Uso em Produção
1. Teste extensivamente com `database_version: "0.0"`
2. Implemente backups regulares
3. Monitore o tamanho do arquivo de log

### Limitações Conhecidas
- Não suporta transações complexas
- Todos os campos são TEXT no SQLite
- Logging síncrono pode impactar performance

### Extensões Recomendadas
- Adicione índices para buscas frequentes
- Implemente cache para consultas repetitivas
- Adicione suporte a migrações de schema

---

## Suporte

Para questões ou problemas:
1. Verifique os arquivos de log em `[database_folder]/log/`
2. Confirme permissões de arquivo
3. Valide a estrutura do schema object
4. Verifique se o sqlite3 está instalado

**Contato:** [Configure canal de suporte específico para sua aplicação]

---

*Documentação atualizada em: 05 de Agosto de 2025*  
*Versão da Biblioteca: 0.1.1*  
*SQLite Version: 3.x*  
