"""
Stock Asset Manager - Local Development Server & CORS Proxy
Zero-dependency Python 3 HTTP Server.
Run: python server/proxy.py
Access at: http://localhost:3000
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys

PORT = 3000
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        # Local Exchange Rate Proxy
        if parsed_path.path == '/api/exchange-rate':
            try:
                url = "https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
                    rate = meta.get('regularMarketPrice') or meta.get('chartPreviousClose') or 1380
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"rate": round(rate, 2)}).encode('utf-8'))
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # Local Quote API Proxy
        if parsed_path.path == '/api/quote':
            query = urllib.parse.parse_qs(parsed_path.query)
            ticker = query.get('ticker', [''])[0].strip().upper()
            if not ticker:
                self.send_error(400, "Missing ticker parameter")
                return

            try:
                # Format for Yahoo Finance
                symbol = ticker
                if symbol.isdigit() and len(symbol) == 6:
                    symbol = f"{symbol}.KS"

                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=2d"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
                    current_price = meta.get('regularMarketPrice') or meta.get('chartPreviousClose')
                    prev_close = meta.get('chartPreviousClose') or meta.get('previousClose')
                    
                    if prev_close and prev_close > 0 and current_price:
                        change_pct = round(((current_price - prev_close) / prev_close) * 100, 2)
                    else:
                        change_pct = 0.0

                    res_payload = {
                        "ticker": ticker,
                        "price": current_price,
                        "changePercent": change_pct,
                        "previousClose": prev_close,
                        "currency": meta.get('currency', 'USD')
                    }
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(res_payload).encode('utf-8'))
                    return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        # Local Search API Proxy
        if parsed_path.path == '/api/search':
            query = urllib.parse.parse_qs(parsed_path.query)
            keyword = query.get('q', [''])[0].strip()
            if not keyword:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps([]).encode('utf-8'))
                return

            try:
                encoded_q = urllib.parse.quote(keyword)
                url = f"https://query1.finance.yahoo.com/v1/finance/search?q={encoded_q}&quotesCount=10&newsCount=0"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=4) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    quotes = data.get('quotes', [])
                    results = []
                    for q in quotes:
                        sym = q.get('symbol', '')
                        if not sym:
                            continue
                        name = q.get('shortname') or q.get('longname') or sym
                        exch = q.get('exchange', '')
                        is_kr = sym.endswith('.KS') or sym.endswith('.KQ') or exch in ['KSC', 'KOE', 'KRX']
                        clean_sym = sym.replace('.KS', '').replace('.KQ', '') if is_kr else sym
                        results.append({
                            "symbol": clean_sym,
                            "rawSymbol": sym,
                            "name": name,
                            "exchange": exch,
                            "market": "KR" if is_kr else "US",
                            "currency": "KRW" if is_kr else "USD",
                            "type": q.get('quoteType', 'EQUITY')
                        })
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(results).encode('utf-8'))
                    return
            except Exception as e:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps([]).encode('utf-8'))
                return

        return super().do_GET()

if __name__ == '__main__':
    os.chdir(BASE_DIR)
    # Use ThreadingHTTPServer for multi-threaded fast response
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), CustomHTTPHandler)
    httpd.allow_reuse_address = True
    print(f"[SUCCESS] Stock Asset Manager Running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
