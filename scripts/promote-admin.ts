import "dotenv/config";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

export function parsePromotionArgs(argv: string[]) {
  const email = argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Usage: pnpm promote-admin owner@example.com");
  }
  return { email };
}

export async function promoteAdmin(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      "UPDATE users SET role = 'admin' WHERE email = ?",
      [email],
    );

    if (result.affectedRows === 0) {
      throw new Error(`No user found with email ${email}`);
    }

    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id, email, role FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    return rows[0] as { id: number; email: string; role: "admin" | "user" };
  } finally {
    await connection.end();
  }
}

async function main() {
  const { email } = parsePromotionArgs(process.argv);
  const user = await promoteAdmin(email);
  console.log(`Promoted ${user.email} to ${user.role}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
