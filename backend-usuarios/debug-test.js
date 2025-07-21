// Script para probar la conexión y estructura de la base de datos
const { Pool } = require("pg")
require("dotenv").config()

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
})

async function testDatabase() {
  console.log("Probando conexión a la base de datos...")

  try {
    // Test 1: Conexión básica
    const client = await pool.connect()
    console.log(" Conexión exitosa")

    // Test 2: Verificar tablas
    console.log("\n Verificando tablas...")
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log(
      "Tablas encontradas:",
      tables.rows.map((r) => r.table_name),
    )

    // Test 3: Verificar estructura de usuarios
    console.log("\nEstructura de tabla usuarios:")
    const userColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      ORDER BY ordinal_position
    `)
    console.table(userColumns.rows)

    // Test 4: Verificar escolaridades
    console.log("\n Escolaridades disponibles:")
    const escolaridades = await client.query("SELECT * FROM escolaridades")
    console.table(escolaridades.rows)

    // Test 5: Probar inserción de prueba
    console.log("\n Probando inserción de usuario de prueba...")

    await client.query("BEGIN")

    try {
      const testUser = await client.query(
        `
        INSERT INTO usuarios 
        (curp, nombre, apellidos, direccion, fecha_nacimiento, escolaridad_id) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nombre, apellidos
      `,
        ["TEST123456789012345", "Usuario", "Prueba", "Dirección de prueba", "1990-01-01", 1],
      )

      console.log("Usuario de prueba creado:", testUser.rows[0])

      // Eliminar usuario de prueba
      await client.query("DELETE FROM usuarios WHERE curp = $1", ["TEST123456789012345"])
      console.log(" Usuario de prueba eliminado")

      await client.query("COMMIT")
    } catch (insertError) {
      await client.query("ROLLBACK")
      console.error(" Error en inserción de prueba:", insertError.message)
      console.error("Código de error:", insertError.code)
      console.error("Detalle:", insertError.detail)
    }

    client.release()
    console.log("\nPruebas completadas")
  } catch (error) {
    console.error(" Error de conexión:", error.message)
    console.error("Código:", error.code)
  }

  process.exit(0)
}

testDatabase()
