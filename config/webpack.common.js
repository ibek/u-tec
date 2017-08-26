var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
const { CheckerPlugin } = require('awesome-typescript-loader')

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
        path: path.resolve(__dirname, '../build'),
        publicPath: '/',
        filename: '[name].js',
        chunkFilename: '[id].chunk.js'
    },
    devtool: "source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            loaders: [
                {
                    loader: 'awesome-typescript-loader',
                    options: { configFileName: 'src/tsconfig.json' }
                }, 'angular2-template-loader'
            ]
        },
        {
            test: /\.html$/,
            loader: 'html-loader',
            options: {
                minimize: true,
                removeComments: true,
                collapseWhitespace: true,

                // angular templates break if these are omitted
                removeAttributeQuotes: false,
                keepClosingSlash: true,
                caseSensitive: true,
                conservativeCollapse: true,
            }
        },
        {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|gltf|bin)$/,
            loader: 'raw-loader'
        },
        {
            test: /\.css$/,
            loaders: ['to-string-loader', 'css-loader']
        },
        {
            test: /\.scss$/,
            use: ExtractTextPlugin.extract({
                fallback: 'style-loader',
                //resolve-url-loader may be chained before sass-loader if necessary
                use: ['css-loader', 'sass-loader']
            })
        }]

    },
    plugins: [new webpack.ContextReplacementPlugin(
        /angular(\\|\/)core(\\|\/)@angular/,
        path.resolve(__dirname, '../src')
    ), new HtmlWebpackPlugin({
        template: 'src/index.html'
    }), new webpack.optimize.CommonsChunkPlugin({
        name: ['app', 'vendor', 'polyfills']
    }), new webpack.LoaderOptionsPlugin({
        htmlLoader: {
            minimize: false // workaround for ng2
        }
    }), CopyWebpackPluginConfig,
    new ExtractTextPlugin('style.css'),
    new CheckerPlugin() // workaround for webpack#3460
    ]

};