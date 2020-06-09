OpenX is beginning to standardize all of its supply integrations onto OpenRTB. We have developed a new prebid adapter based on the OpenRTB specification which we are beginning to test with publishers. This guide will inform you how to move to the new adapter during this alpha phase before the adapter is made publicly available.

You will need to import this new adapter into your prebid build. There are three main ways you can implement this adapter:


### Option 1: Replace the current adapter

The simplest way to test using the new adapter is to simply replace the existing openxBidAdapter.js with this one https://github.com/openx/prebid-adapter/blob/master/OpenRTB/openxBidAdapter.js. This will switch all of your traffic to the new adapter. Your integration will be monitored for performance by comparing to previous time periods to confirm there is no revenue loss. No further updates will be required if the new adapter meets your needs. NOTE: unit tests will fail when you attempt to build, just remove the OpenX spec file (https://github.com/prebid/Prebid.js/blob/master/test/spec/modules/openxBidAdapter_spec.js) for now.


### Option 2: A/B Test the old and new adapters

You may also A/B test the two adapters. This would involve calling OpenX from both the old and new adapters at some percentage. You are free to use your own A/B testing framework if you have one. You will want to download this version https://github.com/openx/prebid-adapter/blob/master/openx2/openx2BidAdapter.js of the new adapter and import it into your prebid build. Notice that you now have a bidder called ‘openx’ and one called ‘openx2’. You should call each adapter with a percentage of traffic. After a test period, we will share the results of the A/B test with you and move forward with the better performing adapter. Here is a simple example of how you could accomplish this.


```
    var openx_code = "openx" + (Math.random() < 0.5 ? "" : "2")
    var adUnits = [{
      code: 'div-2',
      "mediaTypes": {
        "banner": {
          "sizes": [[300, 600], [300, 250]],
        },
      },
      bids: [{
        bidder: openx_code,
        params: {
          delDomain: 'something-d.openx.net',
          unit: 123456789,
        }
      }]
    }];
```



### Option 3: A/B test with a merged adapter

If you would like to run an A/B test between the old and new methods, but lack an A/B testing framework, we have created a merged adapter with both methods. Download and replace openxRtbAdapter.js with this one https://github.com/openx/prebid-adapter/blob/master/merged/openxBidAdapter.js. This adapter will default to a 50/50 test of the old adapter and the new one. You may edit the experiment in this adapter by changing the `window.openxTestRate `variable to be any value between 0.0 and 1.0. If you would like to run a small test with the new functionality, for example, set `window.openxTestRate` to be 0.1 for a 10% test. After a test period, we will share the results of the A/B test with you and move forward with the better performing adapter. NOTE: unit tests will fail when you attempt to build, just remove the OpenX spec file (https://github.com/prebid/Prebid.js/blob/master/test/spec/modules/openxBidAdapter_spec.js) for now.