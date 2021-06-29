var mysql = require("mysql");

const { promisify } = require('util')

const env = process.env.NODE_ENV || "development";
console.log(env);
const config = require(__dirname + "/config/config.json")[env];

//console.log(config);

var pool = mysql.createPool({
  connectionLimit: config.connectionLimit,
  host: config.hostname,
  user: config.username,
  password: config.password,
  database: config.database,
});

console.log("After pool creation");
pool.getConnection((err, connection) => {
  console.log(`CONNECTION ${connection}`);
  if (err) {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.log("ERROR1");
      console.error("Database connection was closed.");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.log("ERROR2");
      console.error("Database has too many connections.");
    }
    if (err.code === "ECONNREFUSED") {
     console.log("ERROR3");
      console.error("Database connection was refused.");
    }
  }
  if (connection) connection.release();
  return;
});

pool.query = promisify(pool.query);

module.exports = pool;
