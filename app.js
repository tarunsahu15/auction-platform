import { config } from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { connection } from "./database/connection.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./router/userRoutes.js";
import auctionItemRouter from "./router/auctionItemRoutes.js";

import bidRouter from "./router/bidRoutes.js";
import commissionRouter from "./router/commissionRouter.js";
import superAdminRouter from "./router/superAdminRoutes.js";
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import { verifyCommissionCron } from "./automation/verifyCommissionCron.js";
// basic code to start any project here I am providing you the blue print to make any project
const app = express();

config({
  path: "./config/config.env", // is used to load environment variables from a file (config.env) into the Node.js application.
});


app.use(
  cors({
    origin: 'https://helpful-sable-b1a0fe.netlify.app',
    methods: ["POST", "GET", "PUT", "DELETE"], // give permission which origin can access the server
    credentials: true,
  })
);
app.use(cookieParser()); // explained above in file
app.use(express.json());  // used to convert the raw json data to js object;
app.use(express.urlencoded({ extended: true }));// frontend form data  to js object;
app.use(
  fileUpload({
    useTempFiles: true,   // use in place of multer 
    tempFileDir: "/tmp/",
  })
);
     
app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionitem", auctionItemRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/superadmin", superAdminRouter);
                                                                   

endedAuctionCron();
verifyCommissionCron();
connection();
app.use(errorMiddleware);

export default app;
