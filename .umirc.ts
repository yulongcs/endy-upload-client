import { IConfig } from 'umi-types';

// ref: https://umijs.org/config/
const config: IConfig =  {
  treeShaking: true,
  // routes: [
  //   {
  //     path: '/',
  //     component: '../layouts/index',
  //     routes: [
  //       { path: '/', component: '../pages/index' }
  //     ]
  //   }
  // ],
  proxy: {
    "/api": {
      "target": "http://127.0.0.1:7001",
      "changeOrigin": true,
      "pathRewrite": { "^/api" : "" }
    }
  },
  plugins: [
    // ref: https://umijs.org/plugin/umi-plugin-react.html
    ['umi-plugin-react', {
      antd: false,
      dva: false,
      dynamicImport: false,
      title: 'client',
      dll: false,
      
      routes: {
        exclude: [
          /components\//,
        ],
      },
    }],
  ],
}

export default config;
