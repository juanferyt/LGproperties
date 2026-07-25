import type { Config } from "tailwindcss";
const config: Config = {content:["./app/**/*.{js,ts,jsx,tsx}","./components/**/*.{js,ts,jsx,tsx}"],theme:{extend:{colors:{ink:"#111111",ivory:"#FAF8F3",sand:"#D8C6A4",gold:"#B88A44",ocean:"#0E4D92",forest:"#245B45"},fontFamily:{display:["Georgia","serif"],sans:["Arial","sans-serif"]},boxShadow:{luxury:"0 20px 60px rgba(17,17,17,.12)"}}},plugins:[]};
export default config;
