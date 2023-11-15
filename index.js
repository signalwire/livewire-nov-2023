import express from "express";
import { Octokit } from "octokit";
import ngrok from "ngrok";
import "dotenv/config";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_REPO_OWNER = process.env.GH_REPO_OWNER;
const GH_REPO_NAME = process.env.GH_REPO_NAME;
const NGROK_CONF_FILE = process.env.NGROK_CONF_FILE;
const PORT = 3565;

const octokit = new Octokit({
  auth: GH_TOKEN,
});

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  console.log(req.body);

  const params = req.body.argument?.parsed[0];

  let response = "Unsupported function";

  if (req.body.function === "create_ticket") {
    try {
      const resp = await octokit.request("POST /repos/{owner}/{repo}/issues", {
        owner: GH_REPO_OWNER,
        repo: GH_REPO_NAME,
        title: params.title,
        body: params.body,
      });

      response = "Created ticket " + resp.data.number;
    } catch (err) {
      console.log(err);
      response = "Sorry, I couldn't create the ticket.";
    }
  } else if (req.body.function === "read_ticket") {
    try {
      // We retrieve the ticket body
      const ticketBody = await octokit.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}",
        {
          owner: GH_REPO_OWNER,
          repo: GH_REPO_NAME,
          issue_number: params.ticket_number,
        }
      );

      // We retrieve the comments in the ticket
      const ticketComments = await octokit.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner: GH_REPO_OWNER,
          repo: GH_REPO_NAME,
          issue_number: params.ticket_number,
        }
      );

      // We build a response
      response =
        "This is the list of updates on the ticket:\n\n" +
        `# ${ticketBody.data.title}\n` +
        `## ${ticketBody.data.created_at}\n${ticketBody.data.body}\n\n` +
        ticketComments.data.map((c) => `## ${c.created_at}\n${c.body}`);
    } catch (err) {
      console.log(err);
      response = "Sorry, I couldn't read the ticket.";
    }
  }

  console.log("Replying:\n", response);
  res.json({ response });
});

app.listen(PORT, async () => {
  console.log(`Example app listening on port ${PORT}`);

  // Note: for demo purposes only. Disable if ngrok is not needed.
  const url = await ngrok.connect({
    configPath: NGROK_CONF_FILE,
    addr: PORT,
    subdomain: "swaiagent",
  });

  console.log("Listening on", url);
});
