require('babel-register')({
  presets: [
    [
      'env',
      {
        targets: {
          node: 'current'
        }
      }
    ],
    'flow'
  ],
  plugins: [
    'transform-flow-comments',
    ['transform-object-rest-spread', { useBuiltIns: true }]
  ]
});
require('./segment-tests');
