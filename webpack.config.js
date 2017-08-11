var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');


var HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
    template: "./src/index.html",
    filename: './index.html',
    inject: 'body'

    }
)

var CopyWebpackPluginConfig = new CopyWebpackPlugin([
    { from: 'src/ships', to: 'ships' },
    { from: 'src/resources', to: 'resources' }
])

module.exports = {
    entry : "./src/Main.ts",
    output : {
        filename : "bundle.js",
        path: path.resolve(__dirname, 'build')
    },
    devtool : "source-map",
    resolve : {
        extensions : [".webpack.config.js","web.js",".ts",".tsx",".js",".jsx",".d.ts"]
    },
    module : {
        rules: [{
            test: /\.tsx?$/,
            loader: 'ts-loader'
        }]
        
    },
    plugins : [HtmlWebpackPluginConfig, CopyWebpackPluginConfig]



};