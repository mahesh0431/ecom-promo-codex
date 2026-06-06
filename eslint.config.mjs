import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "src/generated/**"
    ]
  }
];

export default eslintConfig;
