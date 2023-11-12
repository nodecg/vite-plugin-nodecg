// import the shared js module and the index.css directly (testing for cyclical assets in the manifest.json)
import '../index.css'
import shared from '../shared_module'
shared()
console.log('this is graphic 2')
