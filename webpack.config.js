var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');

var CopyWebpackPluginConfig = new CopyWebpackPlugin([
    { from: 'src/assets', to: 'assets' }
])

module.exports = {
    entry: {
        'polyfills': './src/polyfills.ts',
        'vendor': './src/vendor.ts',
        'app': './src/main.ts'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        publicPath: '/',
        filename: '[name].js',
        chunkFilename: '[id].chunk.js'
    },
    devtool: "source-map",
    resolve: {
        extensions: [".webpack.config.js", "web.js", ".ts", ".tsx", ".js", ".jsx", ".d.ts"]
    },
    module: {
        rules: [{
            test: /\.ts$/,
            loaders: [
                {
                    loader: 'awesome-typescript-loader',
                    options: { configFileName: 'src/tsconfig.json' }
                }, 'angular2-template-loader'
            ]
        },
        {
            test: /\.html$/,
            loader: 'html-loader'
        },
        {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|css)$/,
            loader: 'raw-loader'
        }]

    },
    plugins: [new webpack.ContextReplacementPlugin(
        /angular(\\|\/)core(\\|\/)@angular/,
        path.resolve(__dirname, '../src')
    ), new HtmlWebpackPlugin({
        template: 'src/index.html'
    }), new webpack.optimize.CommonsChunkPlugin({
        name: ['app', 'vendor', 'polyfills']
    }), CopyWebpackPluginConfig, new webpack.LoaderOptionsPlugin({
        htmlLoader: {
            minimize: false // workaround for ng2
        }
    })]



};