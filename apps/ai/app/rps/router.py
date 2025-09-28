from __future__ import annotations
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
import psycopg2, psycopg2.extras
from .models import OrderListItem, CustomerListItem, TransactionListItem, OrderDetail

DB_URL = os.environ.get("DATABASE_URL")
PGSSL = os.environ.get("PGSSL")

def pg():
    sslmode = 'require' if PGSSL else None
    conn = psycopg2.connect(DB_URL, sslmode=sslmode) if sslmode else psycopg2.connect(DB_URL)
    return conn

router = APIRouter(prefix="/rps", tags=["rps"])


def get_session(req: Request):
    # Expect Authorization: Bearer <signed>
    authz = req.headers.get('authorization') or ''
    token = authz[7:] if authz.lower().startswith('bearer ') else None
    # Import lazily to avoid circular import with main
    from ..main import verify_token, AUTH_SECRET  # type: ignore
    payload = verify_token(token or '', AUTH_SECRET)
    if not payload:
        raise HTTPException(status_code=401, detail="unauthorized")
    return payload


def assert_billing_access(sess: dict):
    roles = sess.get('roles') or []
    if isinstance(roles, list) and 'portal-manager' in roles:
        return
    perms = sess.get('perms') or []
    if not any(p in perms for p in ('admin','manage_projects','view_usage')):
        raise HTTPException(status_code=403, detail="insufficient permissions")


@router.get('/orders')
def list_orders(request: Request, response: Response, sess: dict = Depends(get_session)):
    org = sess.get('orgUUID') or sess.get('orgId')
    if not org:
        raise HTTPException(status_code=400, detail='org required')
    assert_billing_access(sess)
    url = request.url
    q = (request.query_params.get('q') or '').strip().lower()
    state = (request.query_params.get('state') or '').strip().lower()
    try:
        limit = max(1, min(200, int(request.query_params.get('limit') or '20')))
    except Exception:
        limit = 20
    try:
        offset = max(0, int(request.query_params.get('offset') or '0'))
    except Exception:
        offset = 0
    from_ = request.query_params.get('from')
    to_ = request.query_params.get('to')
    sort = (request.query_params.get('sort') or 'created_at').lower()
    dir_ = 'asc' if (request.query_params.get('dir') or 'desc').lower() == 'asc' else 'desc'
    conn = pg()
    try:
        args = [org]
        where = 'where o.org_id=%s'
        if q:
            args.append(f"%{q}%"); where += f" and (lower(coalesce(o.order_number,'')) like %s or lower(coalesce(o.email,'')) like %s)"
        if state:
            args.append(state); where += f" and lower(coalesce(o.state,'')) = %s"
        if from_:
            args.append(from_); where += f" and o.created_at >= %s"
        if to_:
            args.append(to_); where += f" and o.created_at < %s"
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(f"select count(*)::int as count from billing_orders o {where}", args)
            total = (cur.fetchone() or {}).get('count', 0)
            sort_cols = {
                'created_at': 'o.created_at', 'order_number': 'o.order_number',
                'total_amount': 'o.total_amount', 'state': 'o.state', 'email': 'o.email'
            }
            sort_sql = sort_cols.get(sort, 'o.created_at')
            cur.execute(
                f"""
                select o.id, o.order_number, o.state, o.total_amount, o.currency, o.email, o.customer_id, o.created_at
                from billing_orders o {where}
                order by {sort_sql} {dir_}
                limit {limit} offset {offset}
                """,
                args,
            )
            rows = [dict(r) for r in cur.fetchall()]
        if (request.query_params.get('format') or '').lower() == 'csv':
            headers = ['id','order_number','state','total_amount','currency','email','customer_id','created_at']
            lines = [','.join(headers)]
            for r in rows:
                vals = [r.get('id'), r.get('order_number'), r.get('state'), r.get('total_amount'), r.get('currency'), r.get('email'), r.get('customer_id'), r.get('created_at')]
                def esc(v):
                    if v is None: return ''
                    s = str(v)
                    if ',' in s or '"' in s:
                        return '"' + s.replace('"','""') + '"'
                    return s
                lines.append(','.join(esc(v) for v in vals))
            response.headers['content-type'] = 'text/csv; charset=utf-8'
            return '\n'.join(lines)
        return { 'rows': rows, 'limit': limit, 'offset': offset, 'q': q, 'state': state, 'total': total, 'sort': sort, 'dir': dir_ }
    finally:
        conn.close()


@router.get('/customers')
def list_customers(request: Request, response: Response, sess: dict = Depends(get_session)):
    org = sess.get('orgUUID') or sess.get('orgId')
    if not org:
        raise HTTPException(status_code=400, detail='org required')
    assert_billing_access(sess)
    q = (request.query_params.get('q') or '').strip().lower()
    try:
        limit = max(1, min(200, int(request.query_params.get('limit') or '20')))
    except Exception:
        limit = 20
    try:
        offset = max(0, int(request.query_params.get('offset') or '0'))
    except Exception:
        offset = 0
    from_ = request.query_params.get('from')
    to_ = request.query_params.get('to')
    sort = (request.query_params.get('sort') or 'created_at').lower()
    dir_ = 'asc' if (request.query_params.get('dir') or 'desc').lower() == 'asc' else 'desc'
    conn = pg()
    try:
        args = [org]
        where = 'where c.org_id=%s'
        if q:
            args.append(f"%{q}%"); where += f" and (lower(coalesce(c.email,'')) like %s or lower(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')) like %s)"
        if from_:
            args.append(from_); where += f" and c.created_at >= %s"
        if to_:
            args.append(to_); where += f" and c.created_at < %s"
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(f"select count(*)::int as count from billing_customers c {where}", args)
            total = (cur.fetchone() or {}).get('count', 0)
            sort_cols = { 'created_at':'c.created_at','email':'c.email','first_name':'c.first_name','last_name':'c.last_name' }
            sort_sql = sort_cols.get(sort, 'c.created_at')
            cur.execute(
                f"""
                select c.id, c.first_name, c.last_name, c.email, c.created_at
                from billing_customers c {where}
                order by {sort_sql} {dir_}
                limit {limit} offset {offset}
                """,
                args,
            )
            rows = [dict(r) for r in cur.fetchall()]
        if (request.query_params.get('format') or '').lower() == 'csv':
            headers = ['id','first_name','last_name','email','created_at']
            lines = [','.join(headers)]
            for r in rows:
                vals = [r.get('id'), r.get('first_name'), r.get('last_name'), r.get('email'), r.get('created_at')]
                def esc(v):
                    if v is None: return ''
                    s = str(v)
                    if ',' in s or '"' in s:
                        return '"' + s.replace('"','""') + '"'
                    return s
                lines.append(','.join(esc(v) for v in vals))
            response.headers['content-type'] = 'text/csv; charset=utf-8'
            return '\n'.join(lines)
        return { 'rows': rows, 'limit': limit, 'offset': offset, 'q': q, 'total': total, 'sort': sort, 'dir': dir_ }
    finally:
        conn.close()


@router.get('/transactions')
def list_transactions(request: Request, response: Response, sess: dict = Depends(get_session)):
    org = sess.get('orgUUID') or sess.get('orgId')
    if not org:
        raise HTTPException(status_code=400, detail='org required')
    assert_billing_access(sess)
    q = (request.query_params.get('q') or '').strip().lower()
    try:
        limit = max(1, min(200, int(request.query_params.get('limit') or '20')))
    except Exception:
        limit = 20
    try:
        offset = max(0, int(request.query_params.get('offset') or '0'))
    except Exception:
        offset = 0
    from_ = request.query_params.get('from')
    to_ = request.query_params.get('to')
    sort = (request.query_params.get('sort') or 'created_at').lower()
    dir_ = 'asc' if (request.query_params.get('dir') or 'desc').lower() == 'asc' else 'desc'
    processor = (request.query_params.get('processor') or '').strip().lower()
    conn = pg()
    try:
        args = [org]
        where = 'where t.org_id=%s'
        if q:
            args.append(f"%{q}%"); where += f" and (lower(coalesce(t.processor,'')) like %s or lower(coalesce(t.response_code,'')) like %s)"
        if processor:
            args.append(processor); where += f" and lower(coalesce(t.processor,'')) = %s"
        if from_:
            args.append(from_); where += f" and t.created_at >= %s"
        if to_:
            args.append(to_); where += f" and t.created_at < %s"
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(f"select count(*)::int as count from billing_transactions t {where}", args)
            total = (cur.fetchone() or {}).get('count', 0)
            sort_cols = { 'created_at':'t.created_at','amount':'t.amount','processor':'t.processor','state':'t.state','response_code':'t.response_code' }
            sort_sql = sort_cols.get(sort, 't.created_at')
            cur.execute(
                f"""
                select t.id, t.order_id, t.state, t.amount, t.currency, t.processor, t.response_code, t.created_at
                from billing_transactions t {where}
                order by {sort_sql} {dir_}
                limit {limit} offset {offset}
                """,
                args,
            )
            rows = [dict(r) for r in cur.fetchall()]
        if (request.query_params.get('format') or '').lower() == 'csv':
            headers = ['id','order_id','state','amount','currency','processor','response_code','created_at']
            lines = [','.join(headers)]
            for r in rows:
                vals = [r.get('id'), r.get('order_id'), r.get('state'), r.get('amount'), r.get('currency'), r.get('processor'), r.get('response_code'), r.get('created_at')]
                def esc(v):
                    if v is None: return ''
                    s = str(v)
                    if ',' in s or '"' in s:
                        return '"' + s.replace('"','""') + '"'
                    return s
                lines.append(','.join(esc(v) for v in vals))
            response.headers['content-type'] = 'text/csv; charset=utf-8'
            return '\n'.join(lines)
        return { 'rows': rows, 'limit': limit, 'offset': offset, 'q': q, 'processor': processor, 'total': total, 'sort': sort, 'dir': dir_ }
    finally:
        conn.close()


@router.get('/orders/{id}')
def get_order(id: str, sess: dict = Depends(get_session)):
    org = sess.get('orgUUID') or sess.get('orgId')
    if not org:
        raise HTTPException(status_code=400, detail='org required')
    assert_billing_access(sess)
    conn = pg()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("select * from billing_orders where id=%s and org_id=%s", (id, org))
            o = cur.fetchone()
            if not o:
                raise HTTPException(status_code=404, detail='order not found')
            cur.execute("select * from billing_order_items where order_id=%s and org_id=%s and deleted_at is null order by created_at asc", (id, org))
            items = [dict(r) for r in cur.fetchall()]
            cur.execute("select * from billing_transactions where order_id=%s and org_id=%s and deleted_at is null order by created_at desc", (id, org))
            txns = [dict(r) for r in cur.fetchall()]
            cur.execute("select * from billing_tracking_numbers where order_id=%s and org_id=%s and deleted_at is null order by created_at asc", (id, org))
            tracks = [dict(r) for r in cur.fetchall()]
            billing = shipping = None
            if o.get('billing_address_id'):
                cur.execute("select * from billing_addresses where id=%s and org_id=%s", (o['billing_address_id'], org))
                r = cur.fetchone(); billing = dict(r) if r else None
            if o.get('shipping_address_id'):
                cur.execute("select * from billing_addresses where id=%s and org_id=%s", (o['shipping_address_id'], org))
                r = cur.fetchone(); shipping = dict(r) if r else None
            if not billing or not shipping:
                cur.execute("select * from billing_addresses where order_id=%s and org_id=%s", (id, org))
                for a in cur.fetchall():
                    a = dict(a)
                    if not billing and str(a.get('kind')) == 'billing':
                        billing = a
                    if not shipping and str(a.get('kind')) == 'shipping':
                        shipping = a
            customer = None
            if o.get('customer_id'):
                cur.execute("select id, first_name, last_name, email, created_at from billing_customers where id=%s and org_id=%s", (o['customer_id'], org))
                r = cur.fetchone(); customer = dict(r) if r else None
        return {
            'order': dict(o),
            'items': items,
            'transactions': txns,
            'tracking': tracks,
            'billingAddress': billing,
            'shippingAddress': shipping,
            'customer': customer,
        }
    finally:
        conn.close()
