import { Input } from '@/componentes/ui/Input'

interface Props {
  campos: Record<string, string>
  atualizar: (chave: string, valor: string) => void
}

export function CamposContatoCms({ campos, atualizar }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--texto)]">Contato</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            rotulo="WhatsApp (com DDI)"
            value={campos.whatsapp ?? ''}
            onChange={(e) => atualizar('whatsapp', e.target.value)}
            placeholder="5511999999999"
          />
          <Input
            rotulo="E-mail"
            type="email"
            value={campos.email ?? ''}
            onChange={(e) => atualizar('email', e.target.value)}
          />
          <Input
            rotulo="Endereço"
            className="sm:col-span-2"
            value={campos.endereco ?? ''}
            onChange={(e) => atualizar('endereco', e.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-[var(--texto)]">Redes sociais</h3>
        <p className="mb-3 text-xs text-[var(--texto-muted)]">
          Cole a URL completa de cada rede. Deixe em branco para não exibir no site.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            rotulo="Instagram"
            value={campos.instagram ?? ''}
            onChange={(e) => atualizar('instagram', e.target.value)}
            placeholder="https://instagram.com/seuperfil"
          />
          <Input
            rotulo="TikTok"
            value={campos.tiktok ?? ''}
            onChange={(e) => atualizar('tiktok', e.target.value)}
            placeholder="https://tiktok.com/@seuperfil"
          />
          <Input
            rotulo="YouTube"
            value={campos.youtube ?? ''}
            onChange={(e) => atualizar('youtube', e.target.value)}
            placeholder="https://youtube.com/@seucanal"
          />
          <Input
            rotulo="Shopee"
            value={campos.shopee ?? ''}
            onChange={(e) => atualizar('shopee', e.target.value)}
            placeholder="https://shopee.com.br/seuperfil"
          />
        </div>
      </div>
    </div>
  )
}
