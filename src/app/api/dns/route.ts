import { NextRequest, NextResponse } from "next/server";
import dnsPromises from "dns/promises";
import type {
  SoaRecord,
  SrvRecord,
  MxRecord,
  NaptrRecord,
  CaaRecord,
} from "dns";

// Record types that Node.js dns module supports natively
const NATIVE_TYPES = new Set([
  "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "SRV", "PTR", "NAPTR", "CAA",
]);

interface DnsRecord {
  name: string;
  type: string;
  TTL: number;
  data: string;
}

interface DnsSection {
  Answer?: DnsRecord[];
  Authority?: DnsRecord[];
  Additional?: DnsRecord[];
}

function formatTxt(values: string[][]): string[] {
  return values.map((chunks) => chunks.join(""));
}

function formatSoa(soa: SoaRecord): string {
  return `${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire} ${soa.minttl}`;
}

function formatSrv(records: SrvRecord[]): DnsRecord[] {
  return records.map((r) => ({
    name: r.name,
    type: "SRV",
    TTL: 0,
    data: `${r.priority} ${r.weight} ${r.port} ${r.name}`,
  }));
}

function formatMx(records: MxRecord[]): DnsRecord[] {
  return records.map((r) => ({
    name: r.exchange,
    type: "MX",
    TTL: 0,
    data: `${r.priority} ${r.exchange}`,
  }));
}

function formatNaptr(records: NaptrRecord[]): DnsRecord[] {
  return records.map((r) => ({
    name: r.replacement,
    type: "NAPTR",
    TTL: 0,
    data: `${r.order} ${r.preference} "${r.flags}" "${r.service}" "${r.regexp}" ${r.replacement}`,
  }));
}

function formatCaa(records: CaaRecord[]): DnsRecord[] {
  return records.map((r) => {
    const parts: string[] = [];
    if (r.issue) parts.push(`issue "${r.issue}"`);
    if (r.issuewild) parts.push(`issuewild "${r.issuewild}"`);
    if (r.iodef) parts.push(`iodef "${r.iodef}"`);
    if (r.contactemail) parts.push(`contactemail "${r.contactemail}"`);
    if (r.contactphone) parts.push(`contactphone "${r.contactphone}"`);
    return {
      name: "",
      type: "CAA",
      TTL: 0,
      data: `${r.critical} ${parts.join(" ")}`,
    };
  });
}

async function resolveWithNative(
  hostname: string,
  rrtype: string
): Promise<DnsRecord[]> {
  // Most resolve functions don't return TTL, so we default to 0
  switch (rrtype) {
    case "A": {
      const records = await dnsPromises.resolve4(hostname, { ttl: true });
      return records.map((r) => ({
        name: hostname,
        type: "A",
        TTL: r.ttl,
        data: r.address,
      }));
    }
    case "AAAA": {
      const records = await dnsPromises.resolve6(hostname, { ttl: true });
      return records.map((r) => ({
        name: hostname,
        type: "AAAA",
        TTL: r.ttl,
        data: r.address,
      }));
    }
    case "CNAME": {
      const records = await dnsPromises.resolveCname(hostname);
      return records.map((r) => ({
        name: hostname,
        type: "CNAME",
        TTL: 0,
        data: r,
      }));
    }
    case "MX": {
      const records = await dnsPromises.resolveMx(hostname);
      return formatMx(records);
    }
    case "TXT": {
      const records = await dnsPromises.resolveTxt(hostname);
      return formatTxt(records).map((data) => ({
        name: hostname,
        type: "TXT",
        TTL: 0,
        data,
      }));
    }
    case "NS": {
      const records = await dnsPromises.resolveNs(hostname);
      return records.map((r) => ({
        name: hostname,
        type: "NS",
        TTL: 0,
        data: r,
      }));
    }
    case "SOA": {
      const record = await dnsPromises.resolveSoa(hostname);
      return [
        {
          name: hostname,
          type: "SOA",
          TTL: 0,
          data: formatSoa(record),
        },
      ];
    }
    case "SRV": {
      const records = await dnsPromises.resolveSrv(hostname);
      return formatSrv(records);
    }
    case "PTR": {
      const records = await dnsPromises.resolvePtr(hostname);
      return records.map((r) => ({
        name: hostname,
        type: "PTR",
        TTL: 0,
        data: r,
      }));
    }
    case "NAPTR": {
      const records = await dnsPromises.resolveNaptr(hostname);
      return formatNaptr(records);
    }
    case "CAA": {
      const records = await dnsPromises.resolveCaa(hostname);
      return formatCaa(records);
    }
    default:
      return [];
  }
}

async function resolveWithDoH(
  hostname: string,
  rrtype: string
): Promise<DnsSection> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${rrtype}`;
  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
  });
  if (!res.ok) {
    throw new Error(`DNS-over-HTTPS failed: ${res.status}`);
  }
  const data = await res.json();

  // Normalize section records
  const normalize = (records: Array<{ name: string; type: number; TTL: number; data: string }> | undefined): DnsRecord[] =>
    (records || []).map((r) => ({
      name: r.name,
      type: rrtype,
      TTL: r.TTL,
      data: r.data,
    }));

  return {
    Answer: normalize(data.Answer),
    Authority: normalize(data.Authority),
    Additional: normalize(data.Additional),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const rrtype = searchParams.get("type")?.toUpperCase() || "A";

  if (!domain) {
    return NextResponse.json(
      { error: "Missing domain parameter" },
      { status: 400 }
    );
  }

  // Validate record type
  const allowedTypes = [
    "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "SRV",
    "PTR", "NAPTR", "CAA", "DS", "DNSKEY", "TLSA", "SSHFP",
    "HTTPS", "SVCB",
  ];
  if (!allowedTypes.includes(rrtype)) {
    return NextResponse.json(
      { error: `Unsupported record type: ${rrtype}` },
      { status: 400 }
    );
  }

  try {
    if (NATIVE_TYPES.has(rrtype)) {
      const records = await resolveWithNative(domain, rrtype);
      return NextResponse.json({
        domain,
        type: rrtype,
        Answer: records,
        Authority: [],
        Additional: [],
      });
    } else {
      // For record types not natively supported by Node.js, use DoH server-side
      const result = await resolveWithDoH(domain, rrtype);
      return NextResponse.json({
        domain,
        type: rrtype,
        ...result,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "DNS lookup failed";

    // ENODATA / ENOTFOUND — domain exists but no records of this type
    if (
      (err as NodeJS.ErrnoException).code === "ENODATA" ||
      (err as NodeJS.ErrnoException).code === "ENOTFOUND"
    ) {
      return NextResponse.json({
        domain,
        type: rrtype,
        Answer: [],
        Authority: [],
        Additional: [],
        comment: message,
      });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
