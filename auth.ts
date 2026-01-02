import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "72.60.89.5", // VPS IP
    user: process.env.POSTGRES_USER || "empatia_admin",
    password: process.env.POSTGRES_PASSWORD || "bigmoneycoming",
    database: process.env.POSTGRES_DB || "empatia_db",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
})

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PostgresAdapter(pool),
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const email = credentials.email as string
                const password = credentials.password as string

                // Logic to fetch user from DB
                const client = await pool.connect()
                try {
                    const res = await client.query('SELECT * FROM users WHERE email = $1', [email])
                    const user = res.rows[0]

                    if (!user) {
                        return null
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password)
                    if (!passwordsMatch) {
                        return null
                    }

                    return user
                } finally {
                    client.release()
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, user, token }) {
            // With JWT strategy (default for Credentials), user ID is in token.sub
            if (token?.sub) {
                session.user.id = token.sub
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id
            }
            return token
        }
    },
    session: {
        strategy: "jwt",
    },
})
