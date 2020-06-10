import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import includes from 'core-js-pure/features/array/includes.js'

const bidderConfig = 'hb_pb_ortb';
const bidderVersion = '1.0';
const VIDEO_TARGETING = ['startdelay', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playbackmethod', 'api', 'protocols', 'boxingallowed',
  'linearity', 'delivery', 'protocol', 'placement', 'minbitrate', 'maxbitrate', 'ext'];
const REQUEST_URL = 'https://rtb.openx.net/openrtbb/prebidjs';

export const spec = {
  code: 'openx',
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  transformBidParams
};

registerBidder(spec);

function transformBidParams(params, isOpenRtb) {
  return utils.convertTypes({
    'unit': 'string',
    'customFloor': 'number'
  }, params);
}

function isBidRequestValid(bidRequest) {
  const hasDelDomainOrPlatform = bidRequest.params.delDomain ||
    bidRequest.params.platform;

  if (utils.deepAccess(bidRequest, 'mediaTypes.banner') &&
      hasDelDomainOrPlatform) {
    return !!bidRequest.params.unit ||
      utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0;
  }

  return !!(bidRequest.params.unit && hasDelDomainOrPlatform);
}

function buildRequests(bids, bidderRequest) {
  let videoBids = bids.filter(bid => isVideoBid(bid));
  let bannerBids = bids.filter(bid => isBannerBid(bid));
  let requests = bannerBids.length ? [createBannerRequest(bannerBids, bidderRequest)] : [];
  videoBids.forEach(bid => {
    requests.push(createVideoRequest(bid, bidderRequest));
  });
  return requests;
}

function createBannerRequest(bids, bidderRequest) {
  let data = getBaseRequest(bids[0], bidderRequest);
  data.imp = bids.map(bid => ({
    id: bid.bidId,
    tagid: bid.params.unit,
    banner: {
      format: toFormat(bid.mediaTypes.banner.sizes),
      topframe: utils.inIframe() ? 0 : 1
    },
    bidfloor: getFloor(bid, 'banner')
  }));
  return {
    method: 'POST',
    url: REQUEST_URL,
    data: data
  }
}

function toFormat(sizes) {
  return sizes.map((s) => {
    return { w: s[0], h: s[1] };
  });
}

function createVideoRequest(bid, bidderRequest) {
  let width;
  let height;
  const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  const context = utils.deepAccess(bid, 'mediaTypes.video.context');
  // normalize config for video size
  if (utils.isArray(bid.sizes) && bid.sizes.length === 2 && !utils.isArray(bid.sizes[0])) {
    width = parseInt(bid.sizes[0], 10);
    height = parseInt(bid.sizes[1], 10);
  } else if (utils.isArray(bid.sizes) && utils.isArray(bid.sizes[0]) && bid.sizes[0].length === 2) {
    width = parseInt(bid.sizes[0][0], 10);
    height = parseInt(bid.sizes[0][1], 10);
  } else if (utils.isArray(playerSize) && playerSize.length === 2) {
    width = parseInt(playerSize[0], 10);
    height = parseInt(playerSize[1], 10);
  }
  let data = getBaseRequest(bid, bidderRequest);
  data.imp = [{
    id: bid.bidId,
    tagid: bid.params.unit,
    video: {
      w: width,
      h: height,
      topframe: utils.inIframe() ? 0 : 1
    },
    bidfloor: getFloor(bid, 'video')
  }];
  if (bid.params.openrtb) {
    Object.keys(bid.params.openrtb)
      .filter(param => includes(VIDEO_TARGETING, param))
      .forEach(param => data.imp[0].video[param] = bid.params.openrtb[param]);
  }
  if (bid.params.video) {
    Object.keys(bid.params.video)
      .filter(param => includes(VIDEO_TARGETING, param))
      .forEach(param => data.imp[0].video[param] = bid.params.video[param]);
  }
  if (context) {
    if (context === 'instream') {
      data.imp[0].video.placement = 1;
    } else if (context === 'outstream') {
      data.imp[0].video.placement = 4;
    }
  }
  return {
    method: 'POST',
    url: REQUEST_URL,
    data: data
  }
}

function getBaseRequest(bid, bidderRequest) {
  let req = {
    id: bidderRequest.auctionId,
    cur: ['USD'],
    at: 1,
    tmax: config.getConfig('bidderTimeout'),
    site: {
      page: config.getConfig('pageUrl') || bidderRequest.refererInfo.referer
    },
    regs: {
      coppa: config.getConfig('coppa') === true ? 1 : 0,
    },
    device: {
      dnt: utils.getDNT() ? 1 : 0,
      h: screen.height,
      w: screen.width,
      ua: window.navigator.userAgent,
      language: window.navigator.language.split('-').shift()
    },
    ext: {
      bc: bid.params.bc || `${bidderConfig}_${bidderVersion}`
    }
  };
  if (bid.params.platform) {
    utils.deepSetValue(req, 'ext.platform', bid.params.platform);
  }
  if (bid.params.delDomain) {
    utils.deepSetValue(req, 'ext.delDomain', bid.params.delDomain);
  }
  if (bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      utils.deepSetValue(req, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0);
    }
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      utils.deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }
  }
  if (bidderRequest.uspConsent) {
    utils.deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }
  if (bid.schain) {
    utils.deepSetValue(req, 'source.ext.schain', bid.schain);
  }
  if (bid.userIdAsEids) {
    utils.deepSetValue(req, 'user.ext.eids', bid.userIdAsEids);
  }
  return req;
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function getFloor(bidRequest, mediaType) {
  let floorInfo = {};
  if (typeof bidRequest.getFloor === 'function') {
    floorInfo = bidRequest.getFloor({
      currency: 'USD',
      mediaType: mediaType,
      size: '*'
    });
  }
  return floorInfo.floor || bidRequest.params.customFloor || 0;
}

function interpretResponse(resp, req) {
  const respBody = resp.body;
  if ('nbr' in respBody) {
    return [];
  }

  let bids = [];
  respBody.seatbid.forEach(seatbid =>
    bids = [...bids, ...seatbid.bid.map(bid => ({
      requestId: bid.impid,
      cpm: bid.price,
      width: bid.w,
      height: bid.h,
      creativeId: bid.crid,
      dealId: bid.dealid,
      currency: respBody.cur || 'USD',
      netRevenue: true,
      ttl: 300,
      ad: bid.adm,
      mediaType: 'banner' in req.data.imp[0] ? BANNER : VIDEO
    }))]);

  return bids;
}

/**
 * @param syncOptions
 * @param responses
 * @param gdprConsent
 * @param uspConsent
 * @return {{type: (string), url: (*|string)}[]}
 */
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
  if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
    let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let url = `https://u.openx.net/w/1.0/pd?ph=2d1251ae-7f3a-47cf-bd2a-2f288854a0ba`;
    let queryParamStrings = [];
    if (gdprConsent) {
      queryParamStrings.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
      queryParamStrings.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
    }
    if (uspConsent) {
      queryParamStrings.push('us_privacy=' + encodeURIComponent(uspConsent));
    }
    return [{
      type: pixelType,
      url: `${url}${queryParamStrings.length > 0 ? '&' + queryParamStrings.join('&') : ''}`
    }];
  }
}