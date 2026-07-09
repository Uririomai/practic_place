import dotenv from "dotenv";
import { createApp } from "./app.js"
import { createInitialAdmin } from "./services/users.js";
import { logger } from "./lib/logger.js";

dotenv.config();

createInitialAdmin()

const app = createApp();


const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  logger.info(`listening on :${port}`);
});
