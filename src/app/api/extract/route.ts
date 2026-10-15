import { NextResponse } from 'next/server';
import axios from 'axios';

type ArchiveDoc = {
    identifier: string;
    title?: string;
    year?: string | number;
    description?: string | string[];
};

type ParsedItem = {
    index: number;
    id: string;
    title: string;
    year: string | null;
    description: string | null;
    detailsUrl: string;
    embedUrl: string;
    thumbnailUrl: string;
};

// Films released in 1930 or earlier are public domain in the US as of 2026.
// Raise this by one each January (1931 in 2027, and so on).
const PUBLIC_DOMAIN_CUTOFF_YEAR = 1930;

const BLOCKED_TITLE_TERMS = ['dvdrip', 'bluray', 'brrip', 'webrip', 'hdrip', 'test'];

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userQuery = searchParams.get('query');

        if (!userQuery) {
            return NextResponse.json(
                { success: false, message: 'Required query parameter "query" is missing.' },
                { status: 400 }
            );
        }

        const query = [
            `(${userQuery})`,
            'collection:(feature_films)',
            'mediatype:(movies)',
            `year:[1890 TO ${PUBLIC_DOMAIN_CUTOFF_YEAR}]`,
            `-title:(${BLOCKED_TITLE_TERMS.join(' OR ')})`
        ].join(' AND ');

        const params = new URLSearchParams({
            q: query,
            rows: '30',
            page: '1',
            output: 'json'
        });
        for (const field of ['identifier', 'title', 'year', 'description']) {
            params.append('fl[]', field);
        }

        const response = await axios.get(
            `https://archive.org/advancedsearch.php?${params.toString()}`,
            { timeout: 10000 }
        );

        const docs: ArchiveDoc[] = (response.data?.response?.docs ?? [])
            .filter((d: ArchiveDoc) => Boolean(d.identifier))
            .filter((d: ArchiveDoc) => {
                const haystack = `${d.identifier} ${d.title ?? ''}`.toLowerCase();
                return !BLOCKED_TITLE_TERMS.some((term) => haystack.includes(term));
            });

        const results: ParsedItem[] = docs.map((d, i) => {
            const desc = Array.isArray(d.description) ? d.description[0] : d.description;
            return {
                index: i + 1,
                id: d.identifier,
                title: d.title || 'Untitled',
                year: d.year != null ? String(d.year) : null,
                description: desc ? desc.replace(/<[^>]+>/g, '').trim().slice(0, 300) : null,
                detailsUrl: `https://archive.org/details/${d.identifier}`,
                embedUrl: `https://archive.org/embed/${d.identifier}`,
                thumbnailUrl: `https://archive.org/services/img/${d.identifier}`
            };
        });

        return NextResponse.json({
            success: true,
            meta: {
                query: userQuery,
                totalResults: results.length,
                timestamp: new Date().toISOString()
            },
            results
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, message: 'An error occurred while searching the catalog.', error: message },
            { status: 500 }
        );
    }
}