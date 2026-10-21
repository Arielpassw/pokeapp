import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PokemonComparison, PokemonGalleryImage, PokemonService } from 'src/app/services/pokemon.service';

type DetailTab = 'about' | 'stats' | 'evolution' | 'moves' | 'gallery' | 'compare';

@Component({
  selector: 'app-pokemon-list',
  templateUrl: './pokemon-list.page.html',
  styleUrls: ['./pokemon-list.page.scss'],
})
export class PokemonListPage implements OnInit, OnDestroy {
  pokemon: any;
  loading = false;
  error = '';
  activeTab: DetailTab = 'about';
  moveSearch = '';
  selectedMove: any;
  moveLoading = false;
  moveError = '';
  evolutionChain: any[] = [];
  allPokemon: any[] = [];
  pokemonSearch = '';
  gallery: PokemonGalleryImage[] = [];
  compareSearch = '';
  comparison?: PokemonComparison;
  comparing = false;
  isDarkMode = false;
  private audio?: HTMLAudioElement;
  readonly typeColors: Record<string, string> = {
    electric: '#e8cb12', water: '#6d82cc', fire: '#ef795f', grass: '#78bd86',
    poison: '#a678ba', bug: '#a7b95b', normal: '#a8a89a', flying: '#92a9d1',
    ground: '#d6b36d', rock: '#b9a579', fairy: '#df91ae', fighting: '#d87963',
    psychic: '#e8799d', ghost: '#8276a8', ice: '#77c9d4', dragon: '#7a6bd0',
    dark: '#71675e', steel: '#9aabb4',
  };

  constructor(
    private readonly pokemonService: PokemonService,
    private readonly route: ActivatedRoute,
    readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('pokeapp-theme') === 'dark';
    this.route.paramMap.subscribe(params => this.loadPokemon(params.get('id') || '25'));
    this.pokemonService.getPokemons(1025).subscribe({
      next: response => { this.allPokemon = response.results.map((item: any, index: number) => ({ ...item, id: index + 1 })); },
    });
  }

  get filteredPokemon(): any[] {
    const query = this.pokemonSearch.trim().toLowerCase();
    if (!query) return [];
    return this.allPokemon.filter(item => item.name.includes(query) || String(item.id).includes(query)).slice(0, 8);
  }

  selectPokemon(id: number): void {
    this.pokemonSearch = '';
    this.router.navigate(['/pokemon-list', id]);
  }

  setTab(tab: DetailTab): void {
    this.activeTab = tab;
    if (tab === 'gallery' && this.pokemon && !this.gallery.length) {
      this.pokemonService.getPokemonGallery(this.pokemon.id).subscribe({ next: images => this.gallery = images });
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('pokeapp-theme', this.isDarkMode ? 'dark' : 'light');
  }

  get compareResults(): any[] {
    const query = this.compareSearch.trim().toLowerCase();
    if (!query) return [];
    return this.allPokemon.filter(item => item.id !== this.pokemon?.id
      && (item.name.includes(query) || String(item.id).includes(query))).slice(0, 6);
  }

  compareWith(candidate: any): void {
    this.compareSearch = '';
    this.comparing = true;
    this.pokemonService.comparePokemons(this.pokemon.id, candidate.id).subscribe({
      next: data => { this.comparison = data; this.comparing = false; },
      error: () => { this.comparison = undefined; this.comparing = false; },
    });
  }

  ngOnDestroy(): void {
    this.audio?.pause();
  }

  get primaryType(): string {
    return this.pokemon?.types?.[0]?.type?.name || 'normal';
  }

  get typeColor(): string {
    return this.typeColors[this.primaryType] || '#8793b8';
  }

  get displayName(): string {
    return this.pokemon?.name ? this.titleCase(this.pokemon.name) : '';
  }

  get filteredMoves(): any[] {
    const query = this.moveSearch.trim().toLowerCase();
    const moves = this.pokemon?.moves || [];
    if (!query) return moves;
    return moves.filter((entry: any) => entry.move.name.toLowerCase().includes(query)
      || String(entry.move.url.match(/\/move\/(\d+)/)?.[1] || '').includes(query));
  }

  openMove(move: any): void {
    this.selectedMove = undefined;
    this.moveLoading = true;
    this.moveError = '';
    this.pokemonService.getMoveDetails(this.moveId(move.url)).subscribe({
      next: data => { this.selectedMove = data; this.moveLoading = false; },
      error: () => { this.moveError = 'No se pudo cargar la información del movimiento.'; this.moveLoading = false; },
    });
  }

  moveDescription(move: any): string {
    const entry = move?.effect_entries?.find((item: any) => item.language.name === 'en')
      || move?.flavor_text_entries?.find((item: any) => item.language.name === 'en');
    return (entry?.effect || entry?.flavor_text || 'No description available.')
      .replace(/[\n\f]/g, ' ').replace(/\$effect_chance/g, String(move.effect_chance ?? ''));
  }

  loadPokemon(id: string | number): void {
    this.loading = true;
    this.error = '';
    this.pokemonService.getPokemonDetails(String(id).toLowerCase()).subscribe({
      next: data => {
        this.pokemon = data;
        this.loading = false;
        this.moveSearch = '';
        this.selectedMove = undefined;
        this.gallery = [];
        this.comparison = undefined;
        this.evolutionChain = [];
        this.pokemonService.getPokemonSpecies(data.id).subscribe({
          next: species => {
            const chainUrl = species.evolution_chain?.url;
            if (!chainUrl) return;
            this.pokemonService.getResource(chainUrl).subscribe({
              next: result => { this.evolutionChain = this.flattenEvolution(result.chain); },
            });
          },
        });
      },
      error: () => { this.error = 'No se pudo cargar este Pokémon. Intenta de nuevo.'; this.loading = false; },
    });
  }

  changePokemon(offset: number): void {
    const nextId = Math.max(1, (this.pokemon?.id || 25) + offset);
    this.router.navigate(['/pokemon-list', nextId]);
  }

  playCry(): void {
    const url = this.pokemon?.cries?.latest || this.pokemon?.cries?.legacy;
    if (!url) return;
    this.audio?.pause();
    this.audio = new Audio(url);
    void this.audio.play().catch(() => { this.error = 'No se pudo reproducir el audio.'; });
  }

  statLabel(name: string): string {
    const labels: Record<string, string> = { hp: 'HP', attack: 'Attack', defense: 'Defense', 'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed' };
    return labels[name] || this.titleCase(name);
  }

  statPercent(value: number): number { return Math.min(100, Math.round(value / 160 * 100)); }
  titleCase(value: string): string { return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
  moveId(url: string): string { return url.match(/\/move\/(\d+)/)?.[1] || '—'; }
  totalStats(stats: any[]): number { return stats?.reduce((total, stat) => total + stat.base_stat, 0) || 0; }
  private flattenEvolution(chain: any): any[] {
    const result: any[] = [];
    let current = chain;
    while (current) {
      result.push({ name: current.species.name, id: current.species.url.match(/\/pokemon-species\/(\d+)/)?.[1] });
      current = current.evolves_to?.[0];
    }
    return result;
  }
  flavorText(): string {
    const entry = this.pokemon?.species?.flavor_text_entries?.find((item: any) => item.language.name === 'en')
      || this.pokemon?.species?.flavor_text_entries?.[0];
    return entry?.flavor_text?.replace(/[\f\n]/g, ' ') || 'A Pokémon full of surprises.';
  }
}
