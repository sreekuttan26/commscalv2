export async function submitToSheet(payload: {
  timestamp: string;
  action: string;
  date: string;
  category: string;
  title: string;
  platform: string;
  url: string;
  description: string;
  mention: string;
  img_url: string;
  wtw: string;
  website: string;
  remarks: string;
  sm_status: string;
  assigned_to: string;
  req_by: string;
}) {
  const scriptUrl =
    'https://script.google.com/macros/s/AKfycbzIDTi4Ps_ftnzVynozaKDnauMFFNn-yoLGFwyWOEplpkILDEwY-hVvtllxBt7EWc5qDQ/exec'; 

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // required for GAS
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(payload).toString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error submitting to sheet:', error);
    return { success: false, error };
  }
}
