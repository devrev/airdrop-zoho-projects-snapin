import express, { Express, Request, Response } from 'express';
import { functionFactory, FunctionFactoryType } from '../function-factory';
import bodyParser from 'body-parser';
// import dotenv from "dotenv";

const app: Express = express();
const port = 3000;

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});


app.post('/:functionName', (req: Request, res: Response) => {
  const functionName: FunctionFactoryType = req.params.functionName as FunctionFactoryType;
  console.log(`${functionName}\t ${new Date().toLocaleString()}\n ${JSON.stringify(req.body.events)}`);
  const run = functionFactory[functionName];
  if (run) { 
    try {
      run(req.body.events);
      res.status(200).send('Function executed successfully');
    } catch (e) {
      res.status(500).send(`Function execution failed: ${e}`);
    }
  }
})

app.listen(8000, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});