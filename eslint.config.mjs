import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "output/**",
      "src/generated/**"
    ]
  }
];

export default eslintConfig;
