namespace NodeJS{
  interface ProcessEnv{
    PORT: string,
    CLIENT_PORT:string,
    BASE_URL:string,
    DB_URL:string,
    JWT_ACCESS_SECRET:string,
    JWT_REFRESH_SECRET:string
  }
}