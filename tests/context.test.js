const { parseContext } = require("../lib/context");

describe("parseContext", () => {
    it("extracts context properties", () => expect(parseContext({ invokedFunctionArn: "arn:aws:lambda:region:accountId:fn:functionName" })).toEqual({
        accountId: "accountId",
        region: "region",
        functionName: "functionName",
    }));
});
