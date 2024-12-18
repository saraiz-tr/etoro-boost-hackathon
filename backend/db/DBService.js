const sqlite3 = require("sqlite3").verbose();
const DB_NAME = "PostHistory";

const db = new sqlite3.Database(`db/${DB_NAME}.db`, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

class DBService {
  constructor() {
    this.dbName = DB_NAME;
    this.db = db;
    this.initializeDatabase();
  }

  initializeDatabase() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.dbName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        platform TEXT NOT NULL,
        post_id TEXT NOT NULL
      )
    `;
    this.db.run(createTableQuery, (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
      } else {
        console.log("Posting History table created (if not already exists).");
      }
    });
  }

  runQuery(stmt, params) {
    return new Promise((resolve, reject) => {
      stmt.run(...params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes} );
        }
      });
    });
  }

  async insert(data) {
    const { username, platform, content, postId } = data;

    try {

      const stmt = this.db.prepare(`INSERT INTO ${this.dbName} (username, platform, content, post_id, created_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
      );
      const result = await this.runQuery(stmt, [username, platform, content, postId ]);
      console.log(`Post inserted with ID: ${result?.lastID}`);
      stmt.finalize();
      return `Post inserted with ID: ${result?.lastID}`;
    } catch (error) {
      console.error("Error inserting post:", error);
    }
  }

  async delete(data) {
    const { username } = data;
    try {
      const stmt = this.db.prepare( `DELETE FROM ${this.dbName} WHERE username = ?` );
      const result = await this.runQuery(stmt, [username]);
      stmt.finalize();
      return `Deleted ${result?.changes} posts for user ${username}`;
    } catch (error) {
      console.error(`Error deleting posts for user ${username}:`, error);
    }
  }

  async get(data = {}) {
    let sql = `SELECT * FROM ${this.dbName}`;
    const params = [];
    const filters = [];
    if (data.username) {
      filters.push("username = ?");
      params.push(data.username);
    }
    if (data.platform) {
      filters.push("platform = ?");
      params.push(data.platform);
    }
    if (filters.length > 0) {
      sql += ` WHERE ${filters.join(" AND ")}`;
    }
      try {
      const result = new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const posts = rows.map((row) => ({
              id: row.id,
              username: row.username,
              content: row.content,
              platform: row.platform,
              postId: row.post_id,
              createdAt: row.created_at,
            }));
            resolve(posts);
          }
        });
      });
      return result;
    } catch (error) {
      console.error("Error retrieving posts:", error);
    }
  }
}

module.exports = new DBService();
