import DatabaseFile from "./database-file.js";
import readInt from "./read-int.js";
import readPageHeader from "./read-page-header.js";
import readRecord from "./read-record.js";
import readVarint from "./read-varint.js";

const databaseFilePath = process.argv[2];
const command = process.argv[3];
const sqliteSchemaRows = [];


const databaseFile = new DatabaseFile(databaseFilePath);

await databaseFile.open();
await databaseFile.seek(16)
const pageSize = await readInt(databaseFile, 2);
await databaseFile.seek(0);
await databaseFile.seek(100); // Skip database header

const pageHeader = await readPageHeader(databaseFile);
// console.log(pageHeader)
const pos = databaseFile.currentPosition;

await databaseFile.seek(pageSize * 3);
const pageHeader2 = await readPageHeader(databaseFile);
// console.log(pageHeader2)

await databaseFile.seek(pageSize * 1);
const pageHeader3 = await readPageHeader(databaseFile);
// console.log(pageHeader3)


databaseFile.seek(pos);

const cellPointers = [];

for (let i = 0; i < pageHeader.numberOfCells; i++) {
  cellPointers.push(await readInt(databaseFile, 2));
}
// console.log(cellPointers)

// Each of these cells represents a row in the sqlite_schema table.
for (const cellPointer of cellPointers) {
  await databaseFile.seek(cellPointer);

  await readVarint(databaseFile); // Number of bytes in payload
  await readVarint(databaseFile); // Rowid

  const record = await readRecord(databaseFile, 5);

  // Table contains columns: type, name, tbl_name, rootpage, sql
  sqliteSchemaRows.push({
    type: record[0],
    name: record[1],
    tbl_name: record[2],
    rootpage: record[3],
    sql: record[4],
  });
}

// You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");

const matches = command.match(/FROM (.*)/i);

if (command === ".tables") {
  console.log(sqliteSchemaRows.map((row) => (row.tbl_name)).join(" "))
} else if (command === ".dbinfo") {
  console.log(`number of tables: ${sqliteSchemaRows.length}`);
} else if (matches.length > 0) {
  const table = matches[1];
  // console.log(`asking about ${table}`)
  const schemaRow = sqliteSchemaRows.find((row) => (row.tbl_name === table))
  // console.log(schemaRow)
  const npos = databaseFile.currentPosition;

  databaseFile.seek(pageSize * (schemaRow.rootpage - 1))
  const pageHeader4 = await readPageHeader(databaseFile);
  const cellPointers2 = [];

  for (let i = 0; i < pageHeader4.numberOfCells; i++) {
    cellPointers2.push(await readInt(databaseFile, 2));
  }
  // console.log(cellPointers2)
  console.log(cellPointers2.length)


  databaseFile.seek(npos);
} else {
  throw `Unknown command ${command}`;
}
