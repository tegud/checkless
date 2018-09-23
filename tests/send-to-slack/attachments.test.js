const { buildAttachments } = require("../../lib/result-slack-attachment");

describe("result slack attachment", () => {
    describe("For successful check", () => {
        it("Sends successful message", () => {
            expect(buildAttachments({
                url: "http://example.com",
                success: true,
                region: "eu-west-1",
            })).toEqual([
                {
                    color: "good",
                    fallback: "Site check result: http://example.com, eu-west-1 was successful.",
                    title: "Site check http://example.com Successful.",
                    fields: [
                        {
                            title: "URL",
                            value: "http://example.com",
                            short: true,
                        },
                    ],
                },
            ]);
        });
    });

    describe("For failed check", () => {
        it("Sends failure message", () => {
            expect(buildAttachments({
                url: "http://example.com",
                success: false,
                region: "eu-west-1",
            })).toEqual([
                {
                    color: "danger",
                    fallback: "Site check result: http://example.com, eu-west-1 failed.",
                    title: "Site check http://example.com Failed.",
                    fields: [
                        {
                            title: "URL",
                            value: "http://example.com",
                            short: true,
                        },
                    ],
                },
            ]);
        });
    });
});
