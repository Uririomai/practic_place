import dotenv from "dotenv";
import { createApp } from "./app.js"
import { createInitialAdmin } from "./services/users.js";

dotenv.config();

createInitialAdmin()

const app = createApp();


const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`listening on :${port}`);
});
