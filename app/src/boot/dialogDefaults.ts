import { boot } from 'quasar/wrappers'

export default boot(({ app }) => {
  const $q = app.config.globalProperties.$q
  const originalDialog = $q.dialog

  $q.dialog = (opts: any) => {
    if (opts?.persistent === true) {
      const { persistent: _persistent, ...rest } = opts
      return originalDialog({
        ...rest,
        noBackdropDismiss: true,
        noEscDismiss: false
      })
    }

    return originalDialog(opts)
  }
})
