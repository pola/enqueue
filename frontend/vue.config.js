module.exports = {
  configureWebpack: {
    devtool: 'source-map',
  },
  devServer: {
    disableHostCheck: true,
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API,
      },
      
      '/login': {
        target: process.env.VUE_APP_API,
      },
      
      '/logout': {
        target: process.env.VUE_APP_API,
      },
      
      '/socket.io': {
        target: process.env.VUE_APP_API,
      },
      
      '/callback': {
        target: process.env.VUE_APP_API,
      },
    },
  },
}
