import axios from 'axios';

/**
 * GSP (GST Suvidha Provider) adapter for e-Invoice and e-Way Bill generation.
 * Supports TaxPro / ClearTax API format.
 * Configure via env: GSP_BASE_URL, GSP_CLIENT_ID, GSP_CLIENT_SECRET, GSP_USERNAME, GSP_PASSWORD
 */

export type EInvoicePayload = {
  Version: string;
  TranDtls: {
    TaxSch: string;
    SupTyp: string;
    RegRev?: string;
    EcmGstin?: string;
    IgstOnIntra?: string;
  };
  DocDtls: {
    Typ: 'INV' | 'CRN' | 'DBN';
    No: string;
    Dt: string;
  };
  SellerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm?: string;
    Addr1: string;
    Addr2?: string;
    Loc: string;
    Pin: number;
    Stcd: string;
    Ph?: string;
    Em?: string;
  };
  BuyerDtls: {
    Gstin: string;
    LglNm: string;
    TrdNm?: string;
    Pos: string;
    Addr1: string;
    Addr2?: string;
    Loc: string;
    Pin: number;
    Stcd: string;
    Ph?: string;
    Em?: string;
  };
  ItemList: Array<{
    SlNo: string;
    PrdDesc: string;
    IsServc: 'Y' | 'N';
    HsnCd: string;
    Qty?: number;
    Unit?: string;
    UnitPrice: number;
    TotAmt: number;
    Discount?: number;
    AssAmt: number;
    GstRt: number;
    IgstAmt?: number;
    CgstAmt?: number;
    SgstAmt?: number;
    CesRt?: number;
    CesAmt?: number;
    TotItemVal: number;
  }>;
  ValDtls: {
    AssVal: number;
    CgstVal?: number;
    SgstVal?: number;
    IgstVal?: number;
    CesVal?: number;
    Discount?: number;
    OthChrg?: number;
    RndOffAmt?: number;
    TotInvVal: number;
    TotInvValFc?: number;
  };
};

export type EInvoiceResponse = {
  AckNo: string;
  AckDt: string;
  Irn: string;
  SignedInvoice: string;
  SignedQRCode: string;
  Status: string;
  EwbNo?: string;
  EwbDt?: string;
  EwbValidTill?: string;
};

export type GspConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  gstin: string;
};

function getConfig(): GspConfig {
  return {
    baseUrl: process.env.GSP_BASE_URL || 'https://einv-apisandbox.nic.in',
    clientId: process.env.GSP_CLIENT_ID || '',
    clientSecret: process.env.GSP_CLIENT_SECRET || '',
    username: process.env.GSP_USERNAME || '',
    password: process.env.GSP_PASSWORD || '',
    gstin: process.env.GSP_GSTIN || '',
  };
}

let _authToken: string | null = null;
let _tokenExpiry: number = 0;

async function getAuthToken(config: GspConfig): Promise<string> {
  if (_authToken && Date.now() < _tokenExpiry) return _authToken;

  const resp = await axios.post(`${config.baseUrl}/auth/v1.4/accesstoken`, null, {
    params: {
      action: 'ACCESSTOKEN',
      username: config.username,
      password: config.password,
      gspappid: config.clientId,
    },
    headers: { 'client-id': config.clientId, 'client-secret': config.clientSecret },
  });

  _authToken = resp.data.AuthToken;
  _tokenExpiry = Date.now() + 5 * 60 * 60 * 1000; // 5h
  return _authToken!;
}

export async function generateIRN(payload: EInvoicePayload): Promise<EInvoiceResponse> {
  const config = getConfig();
  const token = await getAuthToken(config);

  const resp = await axios.post(`${config.baseUrl}/einvoice/v1.04/invoice`, payload, {
    params: { action: 'PUTEINCFMT', gstin: config.gstin },
    headers: {
      'client-id': config.clientId,
      'client-secret': config.clientSecret,
      'gstin': config.gstin,
      'user_name': config.username,
      'authtoken': token,
    },
  });

  return resp.data;
}

export async function cancelIRN(irn: string, reason: 1 | 2 | 3 | 4 | 5, remarks: string) {
  const config = getConfig();
  const token = await getAuthToken(config);

  const resp = await axios.post(
    `${config.baseUrl}/einvoice/v1.04/invoice/cancel`,
    { Irn: irn, CnlRsn: reason, CnlRem: remarks },
    {
      params: { action: 'CANIRN', gstin: config.gstin },
      headers: {
        'client-id': config.clientId,
        'client-secret': config.clientSecret,
        'gstin': config.gstin,
        'user_name': config.username,
        'authtoken': token,
      },
    },
  );

  return resp.data;
}
