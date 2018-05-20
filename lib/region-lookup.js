const awsRegions = require("aws-regions");

const overrides = {
    "n-virginia": "North Virginia",
    "n-california": "North California",
};

module.exports = {
    lookupLocationFromRegion: (region) => {
        const awsRegion = awsRegions.get(region);

        if (!awsRegion) {
            return region;
        }

        return overrides[awsRegion.name] || `${awsRegion.name[0].toUpperCase()}${awsRegion.name.substring(1)}`;
    },
};
