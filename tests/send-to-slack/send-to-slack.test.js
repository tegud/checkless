const nock = require("nock");

const { sendToSlack } = require("../../send-to-slack");

const promiseSendToSlack = (...args) => new Promise((resolve) => {
    sendToSlack(...args, () => {
        resolve();
    });
});

describe("send-to-slack", () => {
    it("Sends to slack with attachement", async () => {
        const slack = nock("https://hooks.slack.com")
            .post("/", body => body.attachments.length)
            .reply(200);

        process.env.webhookUrl = "/";

        const event = {
            Records: [
                {
                    Sns: {
                        Message: "{}",
                    },
                },
            ],
        };

        const context = {};

        await promiseSendToSlack(event, context);

        slack.done();
    });
});
