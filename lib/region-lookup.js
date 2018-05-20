const awsRegions = require("aws-regions");

module.exports = {
    lookupLocationFromRegion: (region) => {
        const awsRegion = awsRegions.get(region);

        if (!awsRegion) {
            return region;
        }

        return awsRegion.name;
    },
};
