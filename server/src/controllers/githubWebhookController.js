import { handleWebhook } from "../services/githubWebhook.js";

export const webhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"];
    const rawBody = req.rawBody;

    const result = await handleWebhook(event, req.body, signature, rawBody);
    res.json({ message: result.message, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
