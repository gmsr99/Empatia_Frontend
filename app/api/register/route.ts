import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '72.60.89.5',
  user: process.env.POSTGRES_USER || 'empatia_admin',
  password: process.env.POSTGRES_PASSWORD || 'bigmoneycoming',
  database: process.env.POSTGRES_DB || 'empatia_db',
});

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Manual insert since we aren't using an ORM fully yet here for custom register
    const client = await pool.connect();
    try {
      // Create table if not exists (lazy init for this demo flow)
      await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                image TEXT
            );
        `);

      const res = await client.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email',
        [name, email, hashedPassword]
      );
      return NextResponse.json(res.rows[0]);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any).code === '23505') {
        // Unique violation
        return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { message: (error as any).message || 'Error executing request' },
      { status: 500 }
    );
  }
}
