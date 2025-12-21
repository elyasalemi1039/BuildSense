import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "BuildSense",
  version: packageJson.version,
  copyright: `© ${currentYear}, BuildSense.`,
  meta: {
    title: "BuildSense - Digital Building Compliance for Australian Construction",
    description:
      "BuildSense is an intelligent building compliance app that helps builders, designers, and certifiers instantly check whether construction details comply with the Australian National Construction Code (NCC).",
  },
};
