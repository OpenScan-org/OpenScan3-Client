import { boot } from 'quasar/wrappers'
import type { QDialogOptions } from 'quasar'

export default boot(({ app }) => {
  const $q = app.config.globalProperties.$q
  const originalDialog = $q.dialog

  $q.dialog = (opts: QDialogOptions) => {
    if (opts?.persistent === true) {
      const { persistent: _persistent, ...rest } = opts
      void _persistent
      return originalDialog({
        ...rest,
        noBackdropDismiss: true,
        noEscDismiss: false
      })
    }

    return originalDialog(opts)
  }
})
