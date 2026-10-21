import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

export interface PokemonGalleryImage {
  label: string;
  url: string;
  format: 'png' | 'gif' | 'webp' | 'unknown';
  animated: boolean;
}

export interface PokemonComparison {
  pokemon1: any;
  pokemon2: any;
  stats: Array<{ name: string; pokemon1: number; pokemon2: number }>;
  types: { pokemon1: string[]; pokemon2: string[] };
  measurements: {
    heightMeters: { pokemon1: number; pokemon2: number };
    weightKilograms: { pokemon1: number; pokemon2: number };
  };
}

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private apiUrl = 'https://pokeapi.co/api/v2';

  constructor(private http: HttpClient) {}

  // Obtener la lista de Pokémon
  getPokemons(limit: number = 5, offset: number = 0): Observable<any> {
    return this.http.get(`${this.apiUrl}/pokemon?limit=${limit}&offset=${offset}`);
                                          
  }

  // Obtener detalles de un Pokémon por nombre o ID
  getPokemonDetails(nameOrId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pokemon/${nameOrId}`);
  }

  getMoveDetails(nameOrId: string | number): Observable<any> {
    return this.http.get(`${this.apiUrl}/move/${nameOrId}`);
  }

  getPokemonSpecies(nameOrId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pokemon-species/${nameOrId}`);
  }

  getResource(url: string): Observable<any> {
    return this.http.get(url);
  }

  /** Returns the available artwork and sprite variants for a Pokémon.
   * Includes the official artwork, where available, plus regular, back and shiny sprites.
   * Animated GIF/WebP sprites are included when PokéAPI exposes them.
   */
  getPokemonGallery(nameOrId: string | number): Observable<PokemonGalleryImage[]> {
    return this.getPokemonDetails(String(nameOrId).toLowerCase()).pipe(
      map(pokemon => {
        const sprites = pokemon.sprites || {};
        const candidates: Array<{ label: string; url?: string | null; animated: boolean }> = [
          { label: 'Official artwork', url: sprites.other?.['official-artwork']?.front_default, animated: false },
          { label: 'Default front', url: sprites.front_default, animated: false },
          { label: 'Default back', url: sprites.back_default, animated: false },
          { label: 'Shiny front', url: sprites.front_shiny, animated: false },
          { label: 'Shiny back', url: sprites.back_shiny, animated: false },
          { label: 'Animated front', url: sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default, animated: true },
          { label: 'Animated back', url: sprites.versions?.['generation-v']?.['black-white']?.animated?.back_default, animated: true },
          { label: 'Showdown front', url: sprites.other?.showdown?.front_default, animated: true },
          { label: 'Showdown shiny front', url: sprites.other?.showdown?.front_shiny, animated: true },
        ];

        const seen = new Set<string>();
        return candidates
          .filter((image): image is { label: string; url: string; animated: boolean } => !!image.url && !seen.has(image.url) && !!seen.add(image.url))
          .map(image => ({
            label: image.label,
            url: image.url,
            format: this.imageFormat(image.url),
            animated: image.animated || this.imageFormat(image.url) === 'gif',
          }));
      }),
    );
  }

  /** Loads two Pokémon in parallel and returns their raw details plus comparable fields. */
  comparePokemons(first: string | number, second: string | number): Observable<PokemonComparison> {
    return forkJoin({
      pokemon1: this.getPokemonDetails(String(first).toLowerCase()),
      pokemon2: this.getPokemonDetails(String(second).toLowerCase()),
    }).pipe(
      map(({ pokemon1, pokemon2 }) => ({
        pokemon1,
        pokemon2,
        stats: pokemon1.stats.map((stat: any) => ({
          name: stat.stat.name,
          pokemon1: stat.base_stat,
          pokemon2: pokemon2.stats.find((other: any) => other.stat.name === stat.stat.name)?.base_stat ?? 0,
        })),
        types: {
          pokemon1: pokemon1.types.map((item: any) => item.type.name),
          pokemon2: pokemon2.types.map((item: any) => item.type.name),
        },
        measurements: {
          heightMeters: { pokemon1: pokemon1.height / 10, pokemon2: pokemon2.height / 10 },
          weightKilograms: { pokemon1: pokemon1.weight / 10, pokemon2: pokemon2.weight / 10 },
        },
      })),
    );
  }

  private imageFormat(url: string): PokemonGalleryImage['format'] {
    const extension = url.split('?')[0].split('.').pop()?.toLowerCase();
    return extension === 'png' || extension === 'gif' || extension === 'webp' ? extension : 'unknown';
  }
}
