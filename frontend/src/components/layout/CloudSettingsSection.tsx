import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  deleteCloudKey,
  getCloudProfile,
  saveCloudProfile,
  testCloudConnection,
} from '@/lib/api'
import type { CloudCapabilityResponse, CloudProfileResponse } from '@/lib/api'

export default function CloudSettingsSection() {
  const { t } = useTranslation()
  const apiKeyInput = useRef<HTMLInputElement>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [modelId, setModelId] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [profile, setProfile] = useState<CloudProfileResponse | null>(null)
  const [result, setResult] = useState<CloudCapabilityResponse | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let active = true
    void getCloudProfile()
      .then((loaded) => {
        if (!active) return
        setProfile(loaded)
        setBaseUrl(loaded.base_url ?? '')
        setModelId(loaded.model_id ?? '')
        setEnabled(loaded.enabled ?? false)
      })
      .catch(() => {
        if (active) toast.error(t('settings.cloud.profileSaveFailed'))
      })
    return () => {
      active = false
    }
  }, [t])

  const persistProfile = async (includeTypedKey: boolean) => {
    const typedKey = includeTypedKey ? apiKeyInput.current?.value.trim() ?? '' : ''
    const update = {
      base_url: baseUrl,
      model_id: modelId,
      enabled,
      ...(typedKey ? { api_key: typedKey } : {}),
    }
    const saved = await saveCloudProfile(update)
    setProfile(saved)
    if (typedKey && apiKeyInput.current) {
      apiKeyInput.current.value = ''
    }
    return saved
  }

  const handleSaveProfile = async () => {
    try {
      await persistProfile(true)
      toast.success(t('settings.cloud.profileSaved'))
    } catch {
      toast.error(t('settings.cloud.profileSaveFailed'))
    }
  }

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked)
    try {
      const saved = await saveCloudProfile({
        base_url: baseUrl,
        model_id: modelId,
        enabled: checked,
      })
      setProfile(saved)
    } catch {
      toast.error(t('settings.cloud.profileSaveFailed'))
    }
  }

  const handleDeleteKey = async () => {
    try {
      const saved = await deleteCloudKey()
      setProfile(saved)
      if (apiKeyInput.current) apiKeyInput.current.value = ''
      toast.success(t('settings.cloud.keyDeleted'))
    } catch {
      toast.error(t('settings.cloud.keyDeleteFailed'))
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      await persistProfile(true)
      const capability = await testCloudConnection()
      setResult(capability)
    } catch {
      toast.error(t('settings.cloud.testFailed'))
    } finally {
      setTesting(false)
    }
  }

  return (
    <section data-testid="settings-cloud-section" className="space-y-4 py-4 border-b">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t('settings.cloud.title')}</h3>
        <span
          data-testid="settings-cloud-beta"
          className="rounded-full border border-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent"
        >
          {t('settings.cloud.beta')}
        </span>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cloud-enabled">{t('settings.cloud.enable')}</Label>
        <input
          id="cloud-enabled"
          data-testid="settings-cloud-toggle"
          type="checkbox"
          checked={enabled}
          onChange={(event) => void handleToggle(event.target.checked)}
          disabled={testing}
          className="h-4 w-4"
        />
        <p className="text-xs text-muted-foreground">{t('settings.cloud.enableHint')}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cloud-base-url">{t('settings.cloud.baseUrl')}</Label>
        <Input
          id="cloud-base-url"
          data-testid="settings-cloud-base-url"
          type="url"
          value={baseUrl}
          placeholder={t('settings.cloud.baseUrlPlaceholder')}
          onChange={(event) => setBaseUrl(event.target.value)}
          disabled={testing}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cloud-model-id">{t('settings.cloud.modelId')}</Label>
        <Input
          id="cloud-model-id"
          data-testid="settings-cloud-model-id"
          type="text"
          value={modelId}
          placeholder={t('settings.cloud.modelIdPlaceholder')}
          onChange={(event) => setModelId(event.target.value)}
          disabled={testing}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cloud-api-key">{t('settings.cloud.apiKey')}</Label>
        <Input
          id="cloud-api-key"
          data-testid="settings-cloud-api-key"
          ref={apiKeyInput}
          type="password"
          autoComplete="off"
          placeholder={t('settings.cloud.apiKeyPlaceholder')}
          disabled={testing}
        />
        <p data-testid="settings-cloud-key-status" className="text-xs text-muted-foreground">
          {profile?.credential
            ? t('settings.cloud.keyStored', { lastFour: profile.credential.last_four })
            : t('settings.cloud.noKeyStored')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          data-testid="settings-cloud-save-profile"
          onClick={() => void handleSaveProfile()}
          disabled={testing}
        >
          {t('settings.cloud.saveProfile')}
        </Button>
        <Button
          variant="outline"
          data-testid="settings-cloud-delete-key"
          onClick={() => void handleDeleteKey()}
          disabled={testing}
        >
          {t('settings.cloud.deleteKey')}
        </Button>
        <Button
          data-testid="settings-cloud-test-connection"
          onClick={() => void handleTestConnection()}
          disabled={testing}
        >
          {testing ? t('settings.cloud.testingConnection') : t('settings.cloud.testConnection')}
        </Button>
      </div>

      {result && (
        <div data-testid="settings-cloud-result" className="rounded-md border p-3 text-xs space-y-1">
          <div>{t('settings.cloud.model')}: {result.model_id}</div>
          <div>
            {t('settings.cloud.vision')}: {result.can_read_images
              ? t('settings.cloud.visionYes')
              : t('settings.cloud.visionNo')}
          </div>
          <div>{t('settings.cloud.latency')}: {result.latency_ms} ms</div>
          <div>{t('settings.cloud.estimatedCost')}: ${result.estimated_cost_usd.toFixed(4)}</div>
        </div>
      )}
    </section>
  )
}
