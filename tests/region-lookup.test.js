const { lookupLocationFromRegion } = require("../lib/region-lookup");

describe("lookupLocationFromRegion", () => {
    it("is set to region if it does not match known location", () => expect(lookupLocationFromRegion("region")).toBe("region"));

    it("is set to region name if it matches known location", () => expect(lookupLocationFromRegion("eu-west-1")).toBe("Ireland"));

    [
        { region: "us-east-1", location: "North Virginia" },
        { region: "us-west-1", location: "North California" },
    ].forEach(({ region, location }) => {
        const testName = `is set to overriden region name "${region}" when location is ${location}`;
        it(testName, () => expect(lookupLocationFromRegion(region)).toBe(location));
    });
});
