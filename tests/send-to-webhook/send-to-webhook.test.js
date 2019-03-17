const nock = require("nock");

const { sendToWebhook } = require("../../send-to-webhook");

const promiseSendToWebhook = (...args) => new Promise((resolve) => {
    sendToWebhook(...args, () => {
        resolve();
    });
});

describe("send-to-webhook", () => {
    it("Sends body to webhook", async () => {
        const webhook = nock("https://webhook.example.com")
            .post("/test", body => body.success)
            .reply(200);

        process.env.webhookUrl = "https://webhook.example.com/test";

        const event = {
            Records: [
                {
                    Sns: {
                        Message: "{ \"success\": true }",
                    },
                },
            ],
        };

        const context = {};

        await promiseSendToWebhook(event, context);

        webhook.done();
    });
});
