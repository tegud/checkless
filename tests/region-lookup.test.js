const { lookupLocationFromRegion } = require("../lib/region-lookup");

describe("lookupLocationFromRegion", () => {
    it("is set to region if it does not match known location", () => expect(lookupLocationFromRegion("region")).toBe("region"));

    it("is set to region name if it matches known location", () => expect(lookupLocationFromRegion("eu-west-1")).toBe("ireland"));
});
