import { NextResponse, NextRequest } from 'next/server'
import axios from 'axios'

const server_url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8085";

export const middleware = async (request: NextRequest) => {
  try {
    // 检查是否为静态资源请求
    const pathname = request.nextUrl.pathname;
    if (pathname && (pathname !== '/login' && pathname !== '/')) {
      return NextResponse.next();
    }
    const ip = (request.ip || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    console.log(`Client IP: ${ip}`)

    // 格式化 IP 地址
    const formattedIP = ip.replace('::ffff:', '');

    // 获取 IP 白名单
    const all_ip_response = await axios.get(`${server_url}/qingguan/ip_white_list/`);
    const all_ip = all_ip_response.data;

    // 提取 IP 地址列表
    const ipList = all_ip.map((item: any) => item.ip);

    // 检查 IP 是否在白名单中
    if (!ipList.includes(formattedIP)) {
      return NextResponse.json({ message: `Your IP address  ${formattedIP} is not on the whitelist. Please send an email from hubs email to mawb@hubs-scs.com, with the subject line 'ip' and the body of the email stating ${formattedIP}. Upon successful operation, you will receive a confirmation email.` }, { status: 403 });
    }

    return NextResponse.next();
    
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: 'Your IP is Forbidden' }, { status: 403 });
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
