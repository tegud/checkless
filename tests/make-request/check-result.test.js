
const { checkResult } = require("../../lib/make-request/check-url/check-result");

describe("check result", () => {
    describe("when statusCode is set to number", () => {
        it("returns true when status code is 200", () => expect(checkResult({ statusCode: 200 }, { statusCode: 200 })).toBe(true));

        it("returns false when status code is not 200", () => expect(checkResult({ statusCode: 200 }, { statusCode: 500 })).toBe(false));
    });

    describe("when statusCode is set an array", () => {
        it("returns true when status code is 200", () => expect(checkResult({ statusCode: [200, 201] }, { statusCode: 200 })).toBe(true));

        it("returns true when status code is 201", () => expect(checkResult({ statusCode: [200, 201] }, { statusCode: 201 })).toBe(true));

        it("returns false when status code is not 200", () => expect(checkResult({ statusCode: [200, 201] }, { statusCode: 500 })).toBe(false));
    });

    describe("when statusCodeRegex is set", () => {
        it("returns true when status code is 200", () => expect(checkResult({ statusCodeRegex: "2[0-9]{2}" }, { statusCode: 200 })).toBe(true));

        it("returns true when status code is 201", () => expect(checkResult({ statusCodeRegex: "2[0-9]{2}" }, { statusCode: 201 })).toBe(true));

        it("returns false when status code is not in 2xx range", () => expect(checkResult({ statusCodeRegex: "2[0-9]{2}" }, { statusCode: 500 })).toBe(false));
    });
});
