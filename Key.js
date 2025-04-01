import dotenv from 'dotenv'

dotenv.config({ path: './.env.local' });

const Key = process.env.SECRET_KEY

export default Key