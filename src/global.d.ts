namespace NodeJS{
  interface ProcessEnv{
    PORT: string,
    EMail_ID:string,
    EMail_Password:string,
    SERVER_URL:string,
    CLIENT_URL:string,
    DB_URL:string,
    NODE_ENV: string,
    FALLBACK_DB_URL:string,
    JWT_ACCESS_SECRET:string,
    JWT_REFRESH_SECRET:string
  }
}