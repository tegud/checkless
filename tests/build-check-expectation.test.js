const { buildExpectationFromEvent } = require("../lib/make-request/build-check-expectation");

describe("build expectation from event", () => {
    describe("when no properties", () => {
        it("returns check for statusCode of 200", () => expect(buildExpectationFromEvent({})).toEqual({ statusCode: 200 }));
    });

    describe("when statusCode is number", () => {
        it("returns check for statusCode", () => expect(buildExpectationFromEvent({ statusCode: 201 })).toEqual({ statusCode: 201 }));
    });

    describe("when statusCode is string", () => {
        it("returns check for statusCodeRegex", () => expect(buildExpectationFromEvent({ statusCode: "20[0-1]" })).toEqual({ statusCodeRegex: "20[0-1]" }));
    });
});
